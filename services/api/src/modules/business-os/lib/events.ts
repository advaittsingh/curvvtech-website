import { pool } from "../../../db.js";
import { processEventWorkflows } from "./workflows.js";

export async function emitEvent(organizationId: string, eventType: string, payload: Record<string, unknown> = {}) {
  const r = await pool.query(
    `INSERT INTO bos_events (organization_id, event_type, payload_json)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [organizationId, eventType, JSON.stringify(payload)]
  );
  const event = r.rows[0];

  setImmediate(() => {
    processEventWorkflows(organizationId, eventType, payload, event.id).catch(console.error);
  });

  return event;
}

export async function listEvents(organizationId: string, limit = 50) {
  const r = await pool.query(
    `SELECT * FROM bos_events WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [organizationId, limit]
  );
  return r.rows;
}
