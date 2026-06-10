import { pool } from "../db.js";
import { enqueueCall } from "../queues/callQueue.js";

function clampMs(ms: number) {
  // Min 5 minutes, max 48 hours.
  return Math.max(5 * 60_000, Math.min(48 * 3600_000, ms));
}

function guessDelayMsFromText(t: string): number {
  const s = t.toLowerCase();
  if (/(tomorrow)/i.test(s)) return 20 * 3600_000;
  if (/(evening|after 4|after 5|after 6|6 pm|7 pm|8 pm)/i.test(s)) return 6 * 3600_000;
  if (/(afternoon|after 12|1 pm|2 pm|3 pm)/i.test(s)) return 3 * 3600_000;
  if (/(later|call back)/i.test(s)) return 4 * 3600_000;
  return 4 * 3600_000;
}

export async function scheduleCallbackFromUtterance(params: {
  crmLeadId: string;
  utterance: string;
}) {
  const delayMs = clampMs(guessDelayMsFromText(params.utterance || ""));
  const at = new Date(Date.now() + delayMs);
  const iso = at.toISOString();

  await pool.query(
    `UPDATE crm_leads
     SET call_status = 'needs_retry',
         next_call_at = $2,
         "updatedAt" = now()
     WHERE id = $1::uuid`,
    [params.crmLeadId, at]
  );

  await enqueueCall(params.crmLeadId, { notBeforeIso: iso });
  return { nextCallAt: iso };
}

