import { Router } from "express";
import { pool } from "../../db.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { assertQuota } from "../../modules/billing/planUsage.js";
import { rateLimitPerMinute } from "../../middleware/rateLimit.js";
import { config } from "../../config.js";
import * as leadDetailAi from "../../services/leadDetailAi.service.js";
import { extractLeadFromChat } from "../../services/parseLead.js";

export const leadsRouter = Router();

leadsRouter.get("/leads", async (req, res) => {
  const userId = req.internalUser!.id;
  try {
    const result = await pool.query(
      `SELECT id, contact_name, raw_text, summary, status, follow_up_at, created_at
       FROM leads
       WHERE user_id = $1
       ORDER BY follow_up_at ASC NULLS LAST, created_at DESC`,
      [userId]
    );
    return res.json(result.rows);
  } catch (err) {
    req.log?.error({ err }, "GET /leads");
    return res.status(500).json({
      error: "INTERNAL",
      message: "Could not load leads",
    });
  }
});

leadsRouter.post(
  "/parse-lead",
  rateLimitPerMinute(config.rateLimitParseLeadPerMin, (r) => `parse:${r.internalUser!.id}`),
  asyncHandler(async (req, res) => {
    const userId = req.internalUser!.id;
    const text = req.body?.text;
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Missing or invalid text" });
    }

    const idemKey =
      typeof req.headers["idempotency-key"] === "string"
        ? req.headers["idempotency-key"].trim()
        : "";

    let contact_name: string;
    let summary: string;
    let status: string;
    try {
      const extracted = await extractLeadFromChat(text);
      contact_name = extracted.contact_name;
      summary = extracted.summary;
      status = extracted.status;
    } catch (err) {
      req.log?.error({ err }, "POST /parse-lead extract");
      const msg = err instanceof Error ? err.message : "";
      if (msg === "Text too long") {
        return res.status(400).json({ error: "Text too long" });
      }
      throw err;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (idemKey) {
        await client.query(
          `SELECT pg_advisory_xact_lock((abs(hashtext($1::text || chr(31) || $2::text)))::bigint)`,
          [userId, idemKey]
        );
        const prev = await client.query<{ lead_id: number }>(
          `SELECT lead_id FROM parse_lead_idempotency WHERE user_id = $1::uuid AND idempotency_key = $2`,
          [userId, idemKey]
        );
        const existingId = prev.rows[0]?.lead_id;
        if (existingId != null) {
          const existing = await client.query(
            `SELECT id, contact_name, summary, status FROM leads WHERE id = $1 AND user_id = $2::uuid`,
            [existingId, userId]
          );
          await client.query("COMMIT");
          if (existing.rows[0]) {
            return res.status(201).json(existing.rows[0]);
          }
        }
      }

      await assertQuota(client, userId, "lead");

      const result = await client.query(
        `INSERT INTO leads (user_id, contact_name, raw_text, summary, status, follow_up_at)
         VALUES ($1::uuid, $2, $3, $4, $5, NULL)
         RETURNING id, contact_name, summary, status`,
        [userId, contact_name, text, summary, status]
      );
      const row = result.rows[0] as {
        id: number;
        contact_name: string;
        summary: string;
        status: string;
      };

      if (idemKey) {
        await client.query(
          `INSERT INTO parse_lead_idempotency (user_id, idempotency_key, lead_id) VALUES ($1::uuid, $2, $3)`,
          [userId, idemKey, row.id]
        );
      }

      await client.query("COMMIT");
      return res.status(201).json({
        id: row.id,
        contact_name: row.contact_name,
        summary: row.summary,
        status: row.status,
      });
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* ignore */
      }
      throw e;
    } finally {
      client.release();
    }
  })
);

leadsRouter.post(
  "/leads/:id/generate-insights",
  rateLimitPerMinute(config.rateLimitAiPerMin, (r) => `manual-lead-insights:${r.internalUser!.id}`),
  asyncHandler(async (req, res) => {
    const raw = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0] ?? "";
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const out = await leadDetailAi.generateManualLeadInsights(req.internalUser!.id, id);
    res.json(out);
  })
);

leadsRouter.post(
  "/leads/:id/follow-up-draft",
  rateLimitPerMinute(config.rateLimitAiPerMin, (r) => `manual-lead-draft:${r.internalUser!.id}`),
  asyncHandler(async (req, res) => {
    const raw = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0] ?? "";
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const out = await leadDetailAi.generateManualFollowUpDraft(req.internalUser!.id, id);
    res.json(out);
  })
);

leadsRouter.patch("/leads/:id", async (req, res) => {
  const userId = req.internalUser!.id;
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const { status, follow_up_at } = req.body || {};
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (status !== undefined) {
    if (typeof status !== "string") {
      return res.status(400).json({ error: "status must be a string" });
    }
    updates.push(`status = $${i++}`);
    values.push(status);
  }
  if (follow_up_at !== undefined) {
    if (follow_up_at !== null && typeof follow_up_at !== "string") {
      return res.status(400).json({ error: "follow_up_at must be ISO string or null" });
    }
    updates.push(`follow_up_at = $${i++}`);
    values.push(follow_up_at === null ? null : follow_up_at);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  values.push(id, userId);

  try {
    const result = await pool.query(
      `UPDATE leads SET ${updates.join(", ")}
       WHERE id = $${i++} AND user_id = $${i}
       RETURNING id, contact_name, raw_text, summary, status, follow_up_at, created_at`,
      values
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    req.log?.error({ err }, "PATCH /leads/:id");
    return res.status(500).json({ error: "Could not update lead" });
  }
});
