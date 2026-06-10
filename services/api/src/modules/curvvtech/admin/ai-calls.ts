import { Router } from "express";
import { requireCurvvtechAdmin } from "../../../middleware/requireCurvvtechAdmin.js";
import { sql, firstRow } from "../../../lib/sqlPool.js";
import { enqueueBulk, enqueueCall } from "../../../queues/callQueue.js";
import { callQueue } from "../../../queues/callQueue.js";
import { liveListRecent } from "../../../services/twilio/liveCallState.js";

const router = Router();
router.use(requireCurvvtechAdmin);

let lastCampaign: { target: number; startedAt: string } | null = null;

router.post("/start", async (req, res) => {
  try {
    const limit = Number.parseInt(String(req.body?.limit ?? "50"), 10);
    const take = Number.isFinite(limit) ? Math.max(1, Math.min(500, limit)) : 50;

    const rows = await sql`
      SELECT id::text
      FROM crm_leads
      WHERE do_not_call = false
        AND (phone IS NOT NULL AND trim(phone) <> '')
        AND (call_status = 'not_started' OR call_status = 'needs_retry' OR call_status = 'failed')
      ORDER BY "createdAt" DESC
      LIMIT ${take}
    `;
    const ids = rows.map((r: any) => String(r.id));
    if (ids.length === 0) return res.json({ queued: 0 });

    await sql`
      UPDATE crm_leads
      SET call_status = 'queued',
          next_call_at = NULL,
          "updatedAt" = now()
      WHERE id = ANY(${ids}::uuid[])
    `;

    await enqueueBulk(ids);
    lastCampaign = { target: ids.length, startedAt: new Date().toISOString() };
    res.json({ queued: ids.length });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/campaign-status", async (_req, res) => {
  try {
    const counts = await callQueue().getJobCounts("waiting", "active", "delayed", "completed", "failed");
    const active = Number(counts.active || 0);
    const waiting = Number(counts.waiting || 0);
    const delayed = Number(counts.delayed || 0);
    const done = Number(counts.completed || 0);
    const failed = Number(counts.failed || 0);
    res.json({
      last_campaign: lastCampaign,
      queue: { active, waiting, delayed, completed: done, failed },
      running: active + waiting + delayed > 0,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/live", async (_req, res) => {
  try {
    // 15 minutes window
    const items = liveListRecent(15 * 60_000).map((x) => ({
      call_log_id: x.callLogId,
      crm_lead_id: x.crmLeadId,
      lead_name: x.leadName,
      lead_phone: x.leadPhone,
      status: x.status,
      duration_seconds: Math.floor((Date.now() - x.startedAt) / 1000),
      ai_saying: x.lastAiText,
    }));
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/callbacks", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, Number.parseInt(String(req.query.limit ?? "50"), 10) || 50));
    const rows = await sql`
      SELECT id::text, name, phone, company, next_call_at, call_status, status
      FROM crm_leads
      WHERE call_status = 'needs_retry'
        AND next_call_at IS NOT NULL
        AND do_not_call = false
      ORDER BY next_call_at ASC
      LIMIT ${limit}
    `;
    res.json({ items: rows });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/lead/:id/booked", async (req, res) => {
  try {
    const { id } = req.params;
    const row = firstRow(await sql`SELECT id FROM crm_leads WHERE id = ${id}::uuid`);
    if (!row) return res.status(404).json({ error: "Lead not found" });

    await sql`UPDATE crm_leads SET status = 'meeting_booked', "updatedAt" = now() WHERE id = ${id}::uuid`;
    await sql`
      UPDATE call_logs
      SET outcome = 'booked'
      WHERE id = (
        SELECT id FROM call_logs WHERE crm_lead_id = ${id}::uuid ORDER BY created_at DESC LIMIT 1
      )
    `;
    await sql`
      INSERT INTO crm_lead_notes (lead_id, body, is_internal)
      VALUES (${id}::uuid, 'Marked as meeting booked from AI cockpit.', true)
    `;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/lead/:id/dnd", async (req, res) => {
  try {
    const { id } = req.params;
    const row = firstRow(await sql`SELECT id FROM crm_leads WHERE id = ${id}::uuid`);
    if (!row) return res.status(404).json({ error: "Lead not found" });
    await sql`UPDATE crm_leads SET do_not_call = true, "updatedAt" = now() WHERE id = ${id}::uuid`;
    await sql`
      INSERT INTO crm_lead_notes (lead_id, body, is_internal)
      VALUES (${id}::uuid, 'Marked as DND from AI cockpit.', true)
    `;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/lead/:id/hot", async (req, res) => {
  try {
    const { id } = req.params;
    const row = firstRow(await sql`SELECT id FROM crm_leads WHERE id = ${id}::uuid`);
    if (!row) return res.status(404).json({ error: "Lead not found" });
    await sql`UPDATE crm_leads SET status = 'hot', "updatedAt" = now() WHERE id = ${id}::uuid`;
    await sql`
      INSERT INTO crm_lead_notes (lead_id, body, is_internal)
      VALUES (${id}::uuid, 'Marked as HOT from AI cockpit.', true)
    `;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post("/lead/:id/call", async (req, res) => {
  try {
    const { id } = req.params;
    const row = firstRow(await sql`SELECT id FROM crm_leads WHERE id = ${id}::uuid`);
    if (!row) return res.status(404).json({ error: "Lead not found" });

    await sql`
      UPDATE crm_leads
      SET call_status = 'queued',
          next_call_at = NULL,
          "updatedAt" = now()
      WHERE id = ${id}::uuid
    `;
    await enqueueCall(id);
    res.json({ queued: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/logs", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, Number.parseInt(String(req.query.limit ?? "50"), 10) || 50));
    const offset = Math.max(0, Number.parseInt(String(req.query.offset ?? "0"), 10) || 0);
    const status = String(req.query.status ?? "").trim();
    const outcome = String(req.query.outcome ?? "").trim();
    const sinceMinutes = Math.max(0, Number.parseInt(String(req.query.since_minutes ?? "0"), 10) || 0);
    const since =
      sinceMinutes > 0 ? new Date(Date.now() - sinceMinutes * 60_000).toISOString() : null;
    const onlyHot = String(req.query.only_hot ?? "").trim() === "1";

    const rows = await sql`
      SELECT
        cl.id::text,
        cl.status,
        cl.outcome,
        cl.to_e164,
        cl.from_e164,
        cl.provider_call_id,
        cl.duration_seconds,
        cl.recording_url,
        cl.transcript,
        cl.summary,
        cl.created_at,
        l.id::text AS lead_id,
        l.name AS lead_name,
        l.company AS lead_company,
        l.phone AS lead_phone,
        l.call_status AS lead_call_status,
        l.last_call_at AS lead_last_call_at
      FROM call_logs cl
      JOIN crm_leads l ON l.id = cl.crm_lead_id
      WHERE (${status} = '' OR cl.status = ${status})
        AND (${outcome} = '' OR cl.outcome = ${outcome})
        AND (${since}::timestamptz IS NULL OR cl.created_at >= ${since}::timestamptz)
        AND (${onlyHot} = false OR cl.outcome IN ('booked','interested'))
      ORDER BY cl.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    res.json({ items: rows, limit, offset });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/insights", async (_req, res) => {
  try {
    const top = await sql`
      SELECT COALESCE(outcome, 'unknown') AS outcome, COUNT(*)::int AS n
      FROM call_logs
      WHERE created_at >= now() - interval '7 days'
      GROUP BY 1
      ORDER BY n DESC
      LIMIT 8
    `;

    const byHour = await sql`
      SELECT EXTRACT(hour FROM created_at)::int AS hour, COUNT(*)::int AS n
      FROM call_logs
      WHERE created_at >= now() - interval '7 days'
        AND (status IN ('connected','completed') OR (transcript IS NOT NULL AND trim(transcript) <> ''))
      GROUP BY 1
      ORDER BY n DESC
      LIMIT 5
    `;

    const objections = await sql`
      SELECT summary
      FROM call_logs
      WHERE created_at >= now() - interval '7 days'
        AND outcome = 'not_interested'
        AND summary IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 200
    `;

    // Naive keyword extraction (MVP): count common objection buckets from summaries.
    const buckets = {
      already_has: 0,
      not_needed: 0,
      too_busy: 0,
      price: 0,
      unknown: 0,
    };
    for (const r of objections as any[]) {
      const s = String(r.summary || "").toLowerCase();
      if (/(already|have a website|have someone|existing|agency)/i.test(s)) buckets.already_has += 1;
      else if (/(not needed|no need|not required|we're fine)/i.test(s)) buckets.not_needed += 1;
      else if (/(busy|later|no time|call back)/i.test(s)) buckets.too_busy += 1;
      else if (/(price|cost|expensive|budget)/i.test(s)) buckets.price += 1;
      else buckets.unknown += 1;
    }

    res.json({
      top_outcomes: top,
      peak_pickup_hours: byHour,
      common_objections: buckets,
      best_line_hint: "“Are you getting consistent clients online?”",
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const r = await sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS total_calls,
        COUNT(*) FILTER (
          WHERE created_at >= date_trunc('day', now())
            AND (status IN ('connected','completed') OR (transcript IS NOT NULL AND trim(transcript) <> ''))
        )::int AS answered_calls,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()) AND outcome = 'booked')::int AS meetings_booked,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()) AND outcome = 'interested')::int AS interested,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()) AND outcome = 'callback')::int AS callback,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()) AND outcome = 'not_interested')::int AS not_interested
      FROM call_logs
    `;
    const row = firstRow(r) as any;
    const total = Number(row?.total_calls ?? 0);
    const answered = Number(row?.answered_calls ?? 0);
    const interested = Number(row?.interested ?? 0);
    const booked = Number(row?.meetings_booked ?? 0);

    res.json({
      total_calls: total,
      answered_calls: answered,
      meetings_booked: booked,
      interested,
      callback: Number(row?.callback ?? 0),
      not_interested: Number(row?.not_interested ?? 0),
      connection_rate: total > 0 ? answered / total : 0,
      interest_rate: answered > 0 ? interested / answered : 0,
      booking_rate: answered > 0 ? booked / answered : 0,
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;

