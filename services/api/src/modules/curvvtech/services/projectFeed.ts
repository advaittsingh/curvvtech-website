import { firstRow, sql } from '../../../lib/sqlPool.js'
import { listProjectActivity } from './projectActivity.js'

export type FeedEvent = {
  id: string
  event_type: string
  title: string
  description?: string | null
  actor?: string | null
  created_at: string
  icon?: string
}

export async function getProjectFeed(projectId: string): Promise<FeedEvent[]> {
  const events: FeedEvent[] = []

  const activity = await listProjectActivity(projectId)
  for (const a of activity) {
    events.push({
      id: a.id,
      event_type: a.event_type,
      title: a.title,
      description: a.description,
      created_at: a.created_at,
      icon: iconForType(a.event_type),
    })
  }

  const invoices = (await sql`
    SELECT id::text, invoice_number, status, total_cents, paid_at::text, "createdAt"::text
    FROM invoices WHERE project_id = ${projectId}::uuid
    ORDER BY COALESCE(paid_at, "createdAt") DESC LIMIT 20
  `) as { id: string; invoice_number?: string; status?: string; total_cents?: number; paid_at?: string; createdAt?: string }[]

  for (const inv of invoices) {
    if (inv.status === 'paid' && inv.paid_at) {
      const amt = inv.total_cents ? `₹${(Number(inv.total_cents) / 100).toLocaleString('en-IN')}` : ''
      events.push({
        id: `inv-paid-${inv.id}`,
        event_type: 'payment_received',
        title: `Payment received${amt ? ` · ${amt}` : ''}`,
        description: inv.invoice_number ?? undefined,
        created_at: inv.paid_at,
        icon: 'payment',
      })
    } else if (inv.status === 'draft' || inv.status === 'sent') {
      events.push({
        id: `inv-gen-${inv.id}`,
        event_type: 'invoice_generated',
        title: `Invoice #${inv.invoice_number ?? inv.id.slice(0, 6)} generated`,
        created_at: inv.createdAt ?? new Date().toISOString(),
        icon: 'invoice',
      })
    }
  }

  const milestones = (await sql`
    SELECT id::text, title, completed_at::text, "createdAt"::text
    FROM milestones WHERE project_id = ${projectId}::uuid
    ORDER BY COALESCE(completed_at, "createdAt") DESC LIMIT 15
  `) as { id: string; title?: string; completed_at?: string; createdAt?: string }[]

  for (const m of milestones) {
    if (m.completed_at) {
      events.push({
        id: `ms-done-${m.id}`,
        event_type: 'milestone_completed',
        title: `Milestone completed · ${m.title ?? 'Milestone'}`,
        created_at: m.completed_at,
        icon: 'milestone',
      })
    }
  }

  const notes = (await sql`
    SELECT id::text, body, note_type, "createdAt"::text
    FROM updates WHERE project_id = ${projectId}::uuid
    ORDER BY "createdAt" DESC LIMIT 10
  `) as { id: string; body?: string; note_type?: string; createdAt?: string }[]

  for (const n of notes) {
    const label = n.note_type === 'meeting' ? 'Meeting notes added' : n.note_type === 'client' ? 'Client update posted' : 'Requirements updated'
    events.push({
      id: `note-${n.id}`,
      event_type: n.note_type === 'meeting' ? 'meeting_completed' : 'note_posted',
      title: label,
      description: String(n.body ?? '').slice(0, 80),
      created_at: n.createdAt ?? new Date().toISOString(),
      icon: n.note_type === 'meeting' ? 'meeting' : 'note',
    })
  }

  const members = (await sql`
    SELECT pm."createdAt"::text AS created_at, u.email
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ${projectId}::uuid
    ORDER BY pm."createdAt" DESC LIMIT 5
  `) as { created_at?: string; email?: string }[]

  for (const m of members) {
    if (m.created_at && m.email) {
      events.push({
        id: `member-${m.email}-${m.created_at}`,
        event_type: 'member_assigned',
        title: `${m.email.split('@')[0]} assigned to project`,
        created_at: m.created_at,
        icon: 'team',
      })
    }
  }

  const portal = firstRow<{ portal_last_login_at?: string }>(
    await sql`
      SELECT c.portal_last_login_at::text
      FROM projects p JOIN clients c ON c.id = p.client_id
      WHERE p.id = ${projectId}::uuid AND c.portal_last_login_at IS NOT NULL
    `,
  )
  if (portal?.portal_last_login_at) {
    events.push({
      id: `portal-${portal.portal_last_login_at}`,
      event_type: 'portal_view',
      title: 'Client viewed portal',
      created_at: portal.portal_last_login_at,
      icon: 'portal',
    })
  }

  const files = (await sql`
    SELECT id::text, name, "createdAt"::text, uploaded_by_user_id
    FROM files WHERE project_id = ${projectId}::uuid
    ORDER BY "createdAt" DESC LIMIT 10
  `) as { id: string; name?: string; createdAt?: string; uploaded_by_user_id?: string }[]

  for (const f of files) {
    events.push({
      id: `file-${f.id}`,
      event_type: 'file_uploaded',
      title: `Uploaded ${f.name ?? 'file'}`,
      actor: f.uploaded_by_user_id ?? null,
      created_at: f.createdAt ?? new Date().toISOString(),
      icon: 'file',
    })
  }

  // Deduplicate by id, sort desc
  const seen = new Set<string>()
  const unique = events.filter((e) => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return unique.slice(0, 80)
}

function iconForType(type: string): string {
  const map: Record<string, string> = {
    created: 'project',
    milestone_created: 'milestone',
    milestone_completed: 'milestone',
    note_posted: 'note',
    member_assigned: 'team',
    imported: 'project',
    plan_generated: 'ai',
  }
  return map[type] ?? 'activity'
}
