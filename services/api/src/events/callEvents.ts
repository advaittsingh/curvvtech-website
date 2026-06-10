import { pool } from "../db.js";
import { logger } from "../logger.js";

export type CallOutcome = "booked" | "interested" | "not_interested" | "callback" | "no_answer" | "unknown";

function mapOutcomeToCrmStatus(outcome: CallOutcome): string {
  if (outcome === "booked") return "meeting_booked";
  if (outcome === "interested") return "interested";
  if (outcome === "not_interested") return "not_interested";
  if (outcome === "callback") return "callback";
  if (outcome === "no_answer") return "no_answer";
  return "new";
}

export async function onCallFinished(params: {
  crmLeadId: string;
  outcome: CallOutcome;
  summary: string;
}) {
  const crmStatus = mapOutcomeToCrmStatus(params.outcome);

  await pool.query(
    `UPDATE crm_leads
     SET status = $2,
         "updatedAt" = now()
     WHERE id = $1::uuid`,
    [params.crmLeadId, crmStatus]
  );

  await pool.query(
    `INSERT INTO crm_lead_notes (lead_id, body, is_internal)
     VALUES ($1::uuid, $2, true)`,
    [
      params.crmLeadId,
      `AI call outcome: ${params.outcome}\n\n${params.summary}`.trim(),
    ]
  );

  if (params.outcome === "interested") {
    logger.info({ crmLeadId: params.crmLeadId }, "ai_call_followup_interested_todo");
    // MVP: hook point. Wire WhatsApp/email automation here later.
  }

  if (params.outcome === "booked") {
    logger.info({ crmLeadId: params.crmLeadId }, "ai_call_followup_booked_todo");
  }
}

