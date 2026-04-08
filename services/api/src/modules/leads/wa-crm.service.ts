import { pool } from "../../db.js";
import { notFound, forbidden, badRequest } from "../../lib/errors.js";

export async function listWaLeads(tenantId: string) {
  const r = await pool.query(
    `SELECT wl.id::text, wl.conversation_id::text, wl.status, wl.score, wl.summary, wl.follow_up_text,
            wl.notes, wl.tags, wl.assigned_to_user_id::text, wl.updated_at,
            c.customer_wa_id, c.customer_phone_e164, c.last_message_at
     FROM wa_leads wl
     JOIN wa_conversations c ON c.id = wl.conversation_id
     WHERE wl.tenant_id = $1::uuid
     ORDER BY wl.updated_at DESC`,
    [tenantId]
  );
  return r.rows.map((row) => ({
    ...row,
    updated_at: (row.updated_at as Date).toISOString(),
    last_message_at: (row.last_message_at as Date).toISOString(),
  }));
}

export async function patchWaLead(
  tenantId: string,
  leadId: string,
  patch: {
    status?: string;
    notes?: string;
    tags?: string[];
    assigned_to_user_id?: string | null;
  },
  actorUserId: string,
  role: "admin" | "agent"
) {
  if (patch.assigned_to_user_id !== undefined && role !== "admin") {
    throw forbidden("Only admins can assign leads");
  }

  const cur = await pool.query<{ id: string }>(
    `SELECT id::text FROM wa_leads WHERE id = $1::uuid AND tenant_id = $2::uuid`,
    [leadId, tenantId]
  );
  if (!cur.rows[0]) throw notFound("Lead not found");

  const updates: string[] = [];
  const vals: unknown[] = [];
  let i = 1;

  if (patch.status !== undefined) {
    if (typeof patch.status !== "string") throw badRequest("status invalid");
    updates.push(`status = $${i++}`);
    vals.push(patch.status);
  }
  if (patch.notes !== undefined) {
    updates.push(`notes = $${i++}`);
    vals.push(patch.notes);
  }
  if (patch.tags !== undefined) {
    updates.push(`tags = $${i++}`);
    vals.push(patch.tags);
  }
  if (patch.assigned_to_user_id !== undefined) {
    updates.push(`assigned_to_user_id = $${i++}`);
    vals.push(patch.assigned_to_user_id);
  }

  if (updates.length === 0) throw badRequest("No fields to update");

  vals.push(leadId, tenantId);
  await pool.query(
    `UPDATE wa_leads SET ${updates.join(", ")}, updated_at = now() WHERE id = $${i++}::uuid AND tenant_id = $${i}::uuid`,
    vals
  );

  await pool.query(
    `INSERT INTO lead_activities (wa_lead_id, tenant_id, actor_user_id, activity_type, payload)
     VALUES ($1::uuid, $2::uuid, $3::uuid, 'updated', $4::jsonb)`,
    [leadId, tenantId, actorUserId, JSON.stringify(patch)]
  );

  const out = await pool.query(
    `SELECT id::text, conversation_id::text, status, score, summary, follow_up_text, notes, tags,
            assigned_to_user_id::text, updated_at
     FROM wa_leads WHERE id = $1::uuid`,
    [leadId]
  );
  const row = out.rows[0] as Record<string, unknown>;
  return {
    ...row,
    updated_at: (row.updated_at as Date).toISOString(),
  };
}
