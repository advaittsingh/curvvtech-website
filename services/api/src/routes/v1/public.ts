import { Router } from "express";
import { pool } from "../../db.js";
import { jsonError } from "../../lib/jsonError.js";
import { rateLimitPerMinute } from "../../middleware/rateLimit.js";
import { requireLandingApiKey } from "../../middleware/publicApiKey.js";
import { config } from "../../config.js";

export const publicRouter = Router();

publicRouter.get(
  "/waitlist/count",
  requireLandingApiKey,
  rateLimitPerMinute(config.rateLimitPublicPerMin, (req) => `waitlist-count:${req.ip || "unknown"}`),
  async (req, res) => {
    try {
      const r = await pool.query(`SELECT COUNT(*)::int AS c FROM waitlist_entries`);
      const c = (r.rows[0] as { c: number }).c;
      return res.json({ total: c });
    } catch (e) {
      req.log?.error({ err: e }, "public_waitlist_count");
      jsonError(res, 503, "INTERNAL", "Could not load waitlist count");
    }
  }
);

publicRouter.post(
  "/waitlist",
  requireLandingApiKey,
  rateLimitPerMinute(config.rateLimitPublicPerMin, (req) => `waitlist:${req.ip || "unknown"}`),
  async (req, res) => {
    const contact = typeof req.body?.contact === "string" ? req.body.contact.trim() : "";
    if (!contact) {
      jsonError(res, 400, "VALIDATION_ERROR", "contact is required");
      return;
    }

    try {
      const existing = await pool.query(
        `SELECT id FROM waitlist_entries WHERE contact = $1 LIMIT 1`,
        [contact]
      );
      if (existing.rows.length > 0) {
        return res.json({ ok: true, existed: true });
      }
      await pool.query(`INSERT INTO waitlist_entries (contact) VALUES ($1)`, [contact]);
      return res.json({ ok: true, existed: false });
    } catch (e) {
      req.log?.error({ err: e }, "public_waitlist");
      jsonError(res, 500, "INTERNAL", "Could not save waitlist entry");
      return;
    }
  }
);

publicRouter.post(
  "/onboarding",
  requireLandingApiKey,
  rateLimitPerMinute(config.rateLimitPublicPerMin, (req) => `onboard:${req.ip || "unknown"}`),
  async (req, res) => {
    const contact = typeof req.body?.contact === "string" ? req.body.contact.trim() : "";
    const businessName =
      typeof req.body?.business_name === "string" ? req.body.business_name.trim() : "";
    const businessType =
      typeof req.body?.business_type === "string" ? req.body.business_type.trim() : "";
    const description =
      typeof req.body?.description === "string" ? req.body.description.trim() : "";
    const location = typeof req.body?.location === "string" ? req.body.location.trim() : "";
    const finalDescription = location ? `${description}\nLocation: ${location}` : description;

    if (!contact || !businessName || !businessType || !description) {
      jsonError(
        res,
        400,
        "VALIDATION_ERROR",
        "contact, business_name, business_type and description are required"
      );
      return;
    }

    try {
      await pool.query(
        `INSERT INTO landing_onboarding (contact, business_name, business_type, description)
         VALUES ($1, $2, $3, $4)`,
        [contact, businessName, businessType, finalDescription]
      );
      return res.json({ ok: true });
    } catch (e) {
      req.log?.error({ err: e }, "public_onboarding");
      jsonError(res, 500, "INTERNAL", "Could not save onboarding");
      return;
    }
  }
);
