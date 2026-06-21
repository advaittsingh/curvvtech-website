import { pool } from '../../db.js'
import { firstRow, sql } from '../../lib/sqlPool.js'

export type InboundActivityRow = {
  id: string
  demo_request_id: string
  event_type: string
  title: string
  description: string | null
  metadata: Record<string, unknown>
  actor_user_id: string | null
  created_at: string
}

export async function logInboundActivity(
  demoRequestId: string,
  eventType: string,
  title: string,
  description?: string | null,
  actorUserId?: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await sql`
    INSERT INTO inbound_activity (demo_request_id, event_type, title, description, actor_user_id, metadata)
    VALUES (
      ${demoRequestId}::uuid,
      ${eventType},
      ${title},
      ${description ?? null},
      ${actorUserId ?? null},
      ${JSON.stringify(metadata)}::jsonb
    )
  `
}

export async function listInboundActivity(demoRequestId: string): Promise<InboundActivityRow[]> {
  const rows = (await pool.query(
    `SELECT id::text, demo_request_id::text, event_type, title, description,
            metadata, actor_user_id, created_at::text
     FROM inbound_activity
     WHERE demo_request_id = $1::uuid
     ORDER BY created_at ASC`,
    [demoRequestId],
  ).then((r) => r.rows)) as InboundActivityRow[]
  return rows
}

export async function seedInboundTimeline(demoRequestId: string, _createdAt?: string): Promise<void> {
  const existing = firstRow<{ n: number }>(
    await sql`SELECT COUNT(*)::int AS n FROM inbound_activity WHERE demo_request_id = ${demoRequestId}::uuid`,
  )
  if (Number(existing?.n ?? 0) > 0) return
  await logInboundActivity(demoRequestId, 'submitted', 'Lead submitted', 'Inbound enquiry received')
}
