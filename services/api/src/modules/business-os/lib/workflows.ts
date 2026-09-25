import { pool } from "../../../db.js";
import { runAgentForEvent } from "./agentRuntime.js";

const PIPELINE: Record<string, { nextEvent: string; agentSlug: string; action: string }> = {
  "lead.captured": { nextEvent: "lead.qualified", agentSlug: "sales", action: "Qualify lead" },
  "lead.qualified": { nextEvent: "meeting.booked", agentSlug: "sales", action: "Book discovery meeting" },
  "meeting.booked": { nextEvent: "proposal.sent", agentSlug: "sales", action: "Generate proposal" },
  "proposal.sent": { nextEvent: "deal.won", agentSlug: "sales", action: "Close deal" },
  "deal.won": { nextEvent: "invoice.created", agentSlug: "finance", action: "Create invoice" },
  "invoice.created": { nextEvent: "ceo.notified", agentSlug: "ceo-assistant", action: "Notify CEO" },
};

export async function processEventWorkflows(
  organizationId: string,
  eventType: string,
  payload: Record<string, unknown>,
  eventId: string
) {
  await pool.query(`UPDATE bos_events SET processed_at = now() WHERE id = $1`, [eventId]);

  const step = PIPELINE[eventType];
  if (!step) return;

  await runAgentForEvent(organizationId, step.agentSlug, step.action, payload);

  const wf = await pool.query(
    `INSERT INTO bos_workflow_runs (workflow_id, organization_id, status, context_json)
     SELECT id, organization_id, 'completed', $2
     FROM bos_workflow_definitions
     WHERE organization_id = $1 AND slug = 'lead-to-revenue'
     RETURNING id`,
    [organizationId, JSON.stringify({ eventType, payload, action: step.action })]
  );

  if (step.nextEvent !== "ceo.notified") {
    const { emitEvent } = await import("./events.js");
    await emitEvent(organizationId, step.nextEvent, { ...payload, previousEvent: eventType, workflowRunId: wf.rows[0]?.id });
  } else {
    await pool.query(
      `INSERT INTO bos_notifications (organization_id, type, title, body)
       VALUES ($1, 'ceo', 'Pipeline complete', $2)`,
      [organizationId, `Deal closed and invoice created. CEO briefing updated.`]
    );
  }
}

export async function listWorkflows(organizationId: string) {
  const defs = await pool.query(`SELECT * FROM bos_workflow_definitions WHERE organization_id = $1`, [organizationId]);
  const runs = await pool.query(
    `SELECT r.*, w.name as workflow_name FROM bos_workflow_runs r
     JOIN bos_workflow_definitions w ON w.id = r.workflow_id
     WHERE r.organization_id = $1 ORDER BY r.started_at DESC LIMIT 20`,
    [organizationId]
  );
  return { definitions: defs.rows, runs: runs.rows };
}

export async function triggerWorkflow(organizationId: string, slug: string, context: Record<string, unknown>) {
  const wf = await pool.query(
    `SELECT * FROM bos_workflow_definitions WHERE organization_id = $1 AND slug = $2`,
    [organizationId, slug]
  );
  if (!wf.rows[0]) throw new Error("Workflow not found");

  const { emitEvent } = await import("./events.js");
  const trigger = wf.rows[0].trigger_config_json?.event ?? "lead.captured";
  return emitEvent(organizationId, trigger, context);
}
