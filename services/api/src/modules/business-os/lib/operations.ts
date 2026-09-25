import { pool } from "../../../db.js";

export async function listTasks(orgId: string) {
  const r = await pool.query(`SELECT * FROM bos_tasks WHERE organization_id = $1 ORDER BY created_at DESC`, [orgId]);
  return r.rows;
}

export async function createTask(orgId: string, data: { title: string; description?: string; priority?: string; project_id?: string }) {
  const r = await pool.query(
    `INSERT INTO bos_tasks (organization_id, title, description, priority, project_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [orgId, data.title, data.description ?? null, data.priority ?? "medium", data.project_id ?? null]
  );
  return r.rows[0];
}

export async function listProjects(orgId: string) {
  const r = await pool.query(`SELECT * FROM bos_projects WHERE organization_id = $1 ORDER BY created_at DESC`, [orgId]);
  return r.rows;
}

export async function listNotifications(orgId: string, userId?: string) {
  const r = await pool.query(
    `SELECT * FROM bos_notifications WHERE organization_id = $1 AND (user_id IS NULL OR user_id = $2)
     ORDER BY created_at DESC LIMIT 30`,
    [orgId, userId ?? null]
  );
  return r.rows;
}

export async function markNotificationRead(orgId: string, id: string) {
  await pool.query(`UPDATE bos_notifications SET read_at = now() WHERE organization_id = $1 AND id = $2`, [orgId, id]);
}
