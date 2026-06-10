import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { config } from "../config.js";
import { pool } from "../db.js";
import { logger } from "../logger.js";
import { CALL_QUEUE_NAME, type CallJob } from "../queues/callQueue.js";
import { initiateOutboundCall } from "../services/aiCallerService.js";
import { onCallFinished } from "../events/callEvents.js";

type CallLogStatus =
  | "queued"
  | "dialing"
  | "connected"
  | "no_answer"
  | "failed"
  | "completed"
  | "canceled";

function requireRedisUrl() {
  if (!config.redisUrl?.trim()) {
    throw new Error("REDIS_URL is required for AI call worker");
  }
  return config.redisUrl.trim();
}

async function markLeadStatus(crmLeadId: string, callStatus: string, nextCallAt: Date | null) {
  await pool.query(
    `UPDATE crm_leads
     SET call_status = $2,
         last_call_at = CASE WHEN $2 IN ('dialing','in_progress','reached','no_answer','failed','completed') THEN now() ELSE last_call_at END,
         next_call_at = $3,
         call_attempts = CASE WHEN $2 IN ('dialing','in_progress') THEN call_attempts + 1 ELSE call_attempts END,
         "updatedAt" = now()
     WHERE id = $1::uuid`,
    [crmLeadId, callStatus, nextCallAt]
  );
}

async function insertCallLog(params: {
  crmLeadId: string;
  status: CallLogStatus;
  providerCallId?: string | null;
  toE164?: string | null;
  fromE164?: string | null;
  errorMessage?: string | null;
}) {
  const { crmLeadId, status, providerCallId, toE164, fromE164, errorMessage } = params;
  const q = await pool.query(
    `INSERT INTO call_logs (crm_lead_id, provider, provider_call_id, status, to_e164, from_e164, started_at, error_message)
     VALUES ($1::uuid, 'twilio', $2, $3, $4, $5, now(), $6)
     RETURNING id::text`,
    [crmLeadId, providerCallId ?? null, status, toE164 ?? null, fromE164 ?? null, errorMessage ?? null]
  );
  return q.rows[0]?.id as string;
}

async function updateCallLog(params: {
  callLogId: string;
  status: CallLogStatus;
  outcome?: string | null;
  transcript?: string | null;
  summary?: string | null;
  recordingUrl?: string | null;
  durationSeconds?: number | null;
  errorMessage?: string | null;
}) {
  const { callLogId, status, outcome, transcript, summary, recordingUrl, durationSeconds, errorMessage } = params;
  await pool.query(
    `UPDATE call_logs
     SET status = $2,
         outcome = COALESCE($3, outcome),
         transcript = COALESCE($4, transcript),
         summary = COALESCE($5, summary),
         recording_url = COALESCE($6, recording_url),
         duration_seconds = COALESCE($7, duration_seconds),
         ended_at = CASE WHEN $2 IN ('no_answer','failed','completed','canceled') THEN now() ELSE ended_at END,
         error_message = COALESCE($8, error_message)
     WHERE id = $1::uuid`,
    [callLogId, status, outcome ?? null, transcript ?? null, summary ?? null, recordingUrl ?? null, durationSeconds ?? null, errorMessage ?? null]
  );
}

async function simulationAttempt(job: CallJob) {
  const toE164 = job.toE164 ?? null;
  const pick = Math.random();
  const outcome =
    pick < 0.18
      ? "interested"
      : pick < 0.35
        ? "callback"
        : pick < 0.55
          ? "not_interested"
          : "no_answer";

  const logId = await insertCallLog({
    crmLeadId: job.crmLeadId,
    status: "completed",
    providerCallId: `sim_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    toE164,
    fromE164: config.twilioCallFromE164 || null,
  });

  const transcript =
    outcome === "interested"
      ? "ASSISTANT: Hi! Quick question about lead follow-ups.\nUSER: Sure.\nASSISTANT: Would you be open to a 15-minute demo tomorrow?\nUSER: Yes, sounds good."
      : outcome === "callback"
        ? "ASSISTANT: Is now a good time for a quick question?\nUSER: I'm busy. Call me later today."
        : outcome === "not_interested"
          ? "ASSISTANT: Can I ask one quick question about follow-ups?\nUSER: Not interested."
          : "SIMULATION MODE: no call placed.";

  const summary =
    outcome === "interested"
      ? "Lead showed interest and is open to a short demo. Follow up to confirm a time."
      : outcome === "callback"
        ? "Lead asked for a callback later. Follow up to confirm a time window."
        : outcome === "not_interested"
          ? "Lead declined interest. Marked as not interested."
          : "Simulation run. No outbound call was placed.";

  await updateCallLog({
    callLogId: logId,
    status: "completed",
    outcome,
    transcript,
    summary,
    durationSeconds: 0,
  });
  await markLeadStatus(job.crmLeadId, "completed", null);
  await onCallFinished({ crmLeadId: job.crmLeadId, outcome: outcome as any, summary });
}

async function requireDialingConfigured() {
  if (config.aiCallSimulationMode) return;
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioCallFromE164) {
    throw new Error("Twilio calling is not configured (missing TWILIO_* env vars)");
  }
  if (!config.twilioVoiceWebhookBaseUrl) {
    throw new Error("TWILIO_VOICE_WEBHOOK_BASE_URL is required to place calls");
  }
}

export function startCallWorker() {
  const connection = new Redis(requireRedisUrl(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  const limiter =
    config.aiCallRatePerMin > 0
      ? { max: config.aiCallRatePerMin, duration: 60_000 }
      : undefined;

  const worker = new Worker<CallJob>(
    CALL_QUEUE_NAME,
    async (job) => {
      const data = job.data;
      logger.info({ crmLeadId: data.crmLeadId, jobId: job.id }, "ai_call_job_start");

      await requireDialingConfigured();

      if (config.aiCallSimulationMode) {
        await simulationAttempt(data);
        return { mode: "simulation" };
      }

      const started = await initiateOutboundCall({ crmLeadId: data.crmLeadId, toE164: data.toE164 ?? null });
      return { mode: "live", ...started };
    },
    { connection, concurrency: Math.max(1, config.aiCallConcurrency), limiter }
  );

  worker.on("failed", (job, err) => {
    logger.warn(
      { jobId: job?.id, crmLeadId: job?.data?.crmLeadId, err: err?.message },
      "ai_call_job_failed"
    );
  });
  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, crmLeadId: job.data.crmLeadId }, "ai_call_job_completed");
  });

  logger.info(
    {
      queue: CALL_QUEUE_NAME,
      concurrency: Math.max(1, config.aiCallConcurrency),
      ratePerMin: config.aiCallRatePerMin,
      simulation: config.aiCallSimulationMode,
    },
    "ai_call_worker_started"
  );

  return worker;
}

