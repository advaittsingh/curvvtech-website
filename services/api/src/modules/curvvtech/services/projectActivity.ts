import { pool } from '../../../db.js'
import { firstRow, sql } from '../../../lib/sqlPool.js'

export type ProjectActivityRow = {
  id: string
  project_id: string
  event_type: string
  title: string
  description: string | null
  metadata: Record<string, unknown>
  actor_user_id: string | null
  created_at: string
}

export async function logProjectActivity(
  projectId: string,
  eventType: string,
  title: string,
  description?: string | null,
  actorUserId?: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await sql`
    INSERT INTO project_activity (project_id, event_type, title, description, actor_user_id, metadata)
    VALUES (
      ${projectId}::uuid,
      ${eventType},
      ${title},
      ${description ?? null},
      ${actorUserId ?? null},
      ${JSON.stringify(metadata)}::jsonb
    )
  `
}

export async function seedProjectTimeline(projectId: string, projectName?: string): Promise<void> {
  const existing = firstRow<{ n: number }>(
    await sql`SELECT COUNT(*)::int AS n FROM project_activity WHERE project_id = ${projectId}::uuid`,
  )
  if (Number(existing?.n ?? 0) > 0) return
  await logProjectActivity(projectId, 'created', 'Project created', projectName ?? 'New project started')
}

export async function listProjectActivity(projectId: string): Promise<ProjectActivityRow[]> {
  const rows = (await pool.query(
    `SELECT id::text, project_id::text, event_type, title, description,
            metadata, actor_user_id::text, created_at::text
     FROM project_activity
     WHERE project_id = $1::uuid
     ORDER BY created_at DESC
     LIMIT 100`,
    [projectId],
  ).then((r) => r.rows)) as ProjectActivityRow[]
  return rows
}
