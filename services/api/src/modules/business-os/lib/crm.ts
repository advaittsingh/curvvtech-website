import { pool } from "../../../db.js";
import { emitEvent } from "./events.js";

export async function listLeads(orgId: string) {
  const r = await pool.query(`SELECT * FROM bos_leads WHERE organization_id = $1 ORDER BY created_at DESC`, [orgId]);
  return r.rows;
}

export async function createLead(orgId: string, data: {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
}) {
  const r = await pool.query(
    `INSERT INTO bos_leads (organization_id, name, email, phone, source, notes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [orgId, data.name, data.email ?? null, data.phone ?? null, data.source ?? "manual", data.notes ?? null]
  );
  const lead = r.rows[0];
  await emitEvent(orgId, "lead.captured", { leadId: lead.id, name: lead.name });
  return lead;
}

export async function updateLead(orgId: string, leadId: string, patch: Record<string, unknown>) {
  const fields: string[] = [];
  const vals: unknown[] = [orgId, leadId];
  let i = 3;
  for (const key of ["status", "score", "notes", "email", "phone"] as const) {
    if (patch[key] !== undefined) {
      fields.push(`${key} = $${i++}`);
      vals.push(patch[key]);
    }
  }
  if (!fields.length) return null;
  fields.push("updated_at = now()");
  const r = await pool.query(
    `UPDATE bos_leads SET ${fields.join(", ")} WHERE organization_id = $1 AND id = $2 RETURNING *`,
    vals
  );
  return r.rows[0];
}

export async function listActivities(orgId: string, limit = 30) {
  const r = await pool.query(
    `SELECT a.*, ag.name as agent_name FROM bos_activities a
     LEFT JOIN bos_agents ag ON ag.id = a.agent_id
     WHERE a.organization_id = $1 ORDER BY a.created_at DESC LIMIT $2`,
    [orgId, limit]
  );
  return r.rows;
}

export async function listContacts(orgId: string) {
  const r = await pool.query(`SELECT * FROM bos_contacts WHERE organization_id = $1 ORDER BY name`, [orgId]);
  return r.rows;
}

export async function listCompanies(orgId: string) {
  const r = await pool.query(`SELECT * FROM bos_companies WHERE organization_id = $1 ORDER BY name`, [orgId]);
  return r.rows;
}

export async function listDeals(orgId: string) {
  const r = await pool.query(`SELECT * FROM bos_deals WHERE organization_id = $1 ORDER BY created_at DESC`, [orgId]);
  return r.rows;
}
