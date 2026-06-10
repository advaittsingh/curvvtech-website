import express from "express";
import twilio from "twilio";
import { config } from "../../config.js";
import { pool } from "../../db.js";
import { logger } from "../../logger.js";

function twilioMiddleware() {
  return express.urlencoded({
    extended: false,
    verify: (req: express.Request, _res, buf) => {
      req.rawBody = buf;
    },
  });
}

function webhookBaseUrl() {
  const base = config.twilioVoiceWebhookBaseUrl?.trim();
  if (!base) return "";
  return base.replace(/\/$/, "");
}

function computePublicUrl(req: express.Request) {
  const base = webhookBaseUrl();
  if (base) return `${base}${req.originalUrl}`;
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) || req.protocol;
  const host = req.get("host");
  return `${proto}://${host}${req.originalUrl}`;
}

function verifyTwilioSignature(req: express.Request): boolean {
  if (config.nodeEnv !== "production") return true;
  if (!config.twilioAuthToken?.trim()) return false;
  const sig = (req.header("x-twilio-signature") || "").trim();
  if (!sig) return false;
  const url = computePublicUrl(req);
  const params = req.body as Record<string, string>;
  return twilio.validateRequest(config.twilioAuthToken, sig, url, params);
}

function wsUrlForMediaStream(req: express.Request, callLogId: string) {
  const base = webhookBaseUrl();
  const from = base || computePublicUrl(req).replace(req.originalUrl, "");
  const wsBase = from.startsWith("https://")
    ? from.replace(/^https:\/\//, "wss://")
    : from.startsWith("http://")
      ? from.replace(/^http:\/\//, "ws://")
      : from;
  return `${wsBase}/webhook/twilio/voice/stream?callLogId=${encodeURIComponent(callLogId)}`;
}

async function upsertCallLogForAnswered(crmLeadId: string, callSid: string) {
  const q = await pool.query(
    `INSERT INTO call_logs (crm_lead_id, provider, provider_call_id, status, to_e164, from_e164, started_at)
     VALUES ($1::uuid, 'twilio', $2, 'connected', $3, $4, now())
     ON CONFLICT (provider, provider_call_id)
     DO UPDATE SET status = EXCLUDED.status
     RETURNING id::text`,
    [crmLeadId, callSid, null, config.twilioCallFromE164 || null]
  );
  return q.rows[0]?.id as string;
}

async function markLeadConnected(crmLeadId: string) {
  await pool.query(
    `UPDATE crm_leads
     SET call_status = 'in_progress',
         last_call_at = now(),
         "updatedAt" = now()
     WHERE id = $1::uuid`,
    [crmLeadId]
  );
}

export const twilioVoiceWebhookRouter = express.Router();

/**
 * Twilio Voice webhook: called when the callee answers.
 * Returns TwiML that connects a Media Stream to our websocket.
 *
 * Expected query params (MVP):
 * - crmLeadId: UUID of crm_leads row
 */
twilioVoiceWebhookRouter.post("/answer", twilioMiddleware(), async (req, res) => {
  if (!verifyTwilioSignature(req)) {
    return res.status(401).send("invalid signature");
  }
  const crmLeadId = String(req.query.crmLeadId || "").trim();
  if (!crmLeadId) return res.status(400).json({ error: "BAD_REQUEST", message: "crmLeadId required" });

  const callSid = String((req.body as any)?.CallSid || "").trim();
  if (!callSid) return res.status(400).json({ error: "BAD_REQUEST", message: "CallSid required" });

  try {
    const callLogId = await upsertCallLogForAnswered(crmLeadId, callSid);
    await markLeadConnected(crmLeadId);

    const vr = new twilio.twiml.VoiceResponse();
    const connect = vr.connect();
    connect.stream({
      url: wsUrlForMediaStream(req, callLogId),
    });
    res.type("text/xml").send(vr.toString());
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), crmLeadId, callSid }, "twilio_answer_error");
    res.status(500).type("text/xml").send(new twilio.twiml.VoiceResponse().hangup().toString());
  }
});

/**
 * Twilio Voice status callback.
 * We capture final status to update call_logs + crm_leads call_status.
 */
twilioVoiceWebhookRouter.post("/status", twilioMiddleware(), async (req, res) => {
  if (!verifyTwilioSignature(req)) {
    return res.status(401).send("invalid signature");
  }

  const callSid = String((req.body as any)?.CallSid || "").trim();
  const callStatus = String((req.body as any)?.CallStatus || "").trim().toLowerCase();
  const crmLeadId = String(req.query.crmLeadId || "").trim();

  try {
    if (crmLeadId) {
      // Normalize to a small set of lead statuses for MVP.
      const next =
        callStatus === "completed"
          ? "completed"
          : callStatus === "no-answer" || callStatus === "busy" || callStatus === "failed" || callStatus === "canceled"
            ? callStatus.replace("-", "_")
            : "dialing";

      await pool.query(
        `UPDATE crm_leads
         SET call_status = $2,
             last_call_at = now(),
             "updatedAt" = now()
         WHERE id = $1::uuid`,
        [crmLeadId, next]
      );
    }

    if (callSid) {
      const terminal =
        callStatus === "completed" ||
        callStatus === "no-answer" ||
        callStatus === "busy" ||
        callStatus === "failed" ||
        callStatus === "canceled";

      await pool.query(
        `UPDATE call_logs
         SET status = $2,
             ended_at = CASE WHEN $3 THEN now() ELSE ended_at END
         WHERE provider = 'twilio' AND provider_call_id = $1`,
        [callSid, callStatus || "completed", terminal]
      );
    }

    res.json({ ok: true });
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : String(e), callSid, callStatus }, "twilio_status_error");
    res.status(500).json({ ok: false });
  }
});

