import twilio from "twilio";
import { config } from "../config.js";
import { pool } from "../db.js";
import { logger } from "../logger.js";

function requireTwilioConfigured() {
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioCallFromE164) {
    throw new Error("Twilio is not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_CALL_FROM_E164)");
  }
  if (!config.twilioVoiceWebhookBaseUrl) {
    throw new Error("TWILIO_VOICE_WEBHOOK_BASE_URL is required for Twilio voice webhooks");
  }
}

function baseUrl() {
  return config.twilioVoiceWebhookBaseUrl.replace(/\/$/, "");
}

async function ensureDialTarget(crmLeadId: string, toE164?: string | null) {
  const to = (toE164 || "").trim();
  if (to) return to;
  const q = await pool.query(`SELECT phone FROM crm_leads WHERE id = $1::uuid`, [crmLeadId]);
  const p = String(q.rows?.[0]?.phone || "").trim();
  if (!p) throw new Error("Lead has no phone number");
  return p;
}

export async function initiateOutboundCall(params: { crmLeadId: string; toE164?: string | null }) {
  requireTwilioConfigured();

  const to = await ensureDialTarget(params.crmLeadId, params.toE164 ?? null);
  const from = config.twilioCallFromE164;

  const answerUrl = `${baseUrl()}/webhook/twilio/voice/answer?crmLeadId=${encodeURIComponent(
    params.crmLeadId
  )}`;
  const statusUrl = `${baseUrl()}/webhook/twilio/voice/status?crmLeadId=${encodeURIComponent(
    params.crmLeadId
  )}`;

  const inserted = await pool.query(
    `INSERT INTO call_logs (crm_lead_id, provider, status, to_e164, from_e164, started_at)
     VALUES ($1::uuid, 'twilio', 'dialing', $2, $3, now())
     RETURNING id::text`,
    [params.crmLeadId, to, from]
  );
  const callLogId = inserted.rows[0]?.id as string;

  await pool.query(
    `UPDATE crm_leads
     SET call_status = 'dialing',
         last_call_at = now(),
         "updatedAt" = now()
     WHERE id = $1::uuid`,
    [params.crmLeadId]
  );

  const client = twilio(config.twilioAccountSid, config.twilioAuthToken);

  try {
    const call = await client.calls.create({
      to,
      from,
      url: answerUrl,
      method: "POST",
      statusCallback: statusUrl,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    });

    await pool.query(
      `UPDATE call_logs
       SET provider_call_id = $2
       WHERE id = $1::uuid`,
      [callLogId, call.sid]
    );

    logger.info({ crmLeadId: params.crmLeadId, callSid: call.sid }, "twilio_outbound_call_started");
    return { callLogId, callSid: call.sid };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await pool.query(
      `UPDATE call_logs
       SET status = 'failed', error_message = $2, ended_at = now()
       WHERE id = $1::uuid`,
      [callLogId, msg]
    );
    await pool.query(
      `UPDATE crm_leads
       SET call_status = 'failed',
           "updatedAt" = now()
       WHERE id = $1::uuid`,
      [params.crmLeadId]
    );
    throw e;
  }
}

