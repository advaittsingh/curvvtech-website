import { Router } from 'express'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'
import { logProjectActivity, listProjectActivity, seedProjectTimeline } from '../services/projectActivity.js'
import { getProjectFeed } from '../services/projectFeed.js'
import {
  bootstrapProjectFolders,
  createChangeOrder,
  createDeliverableUrl,
  createRevision,
  createScopeItem,
  deleteDeliverableUrl,
  deleteResource,
  deleteRevision,
  deleteScopeItem,
  getDeployment,
  getProjectAnalytics,
  getProjectFinance,
  getProjectRichTimeline,
  listChangeOrders,
  listDeliverableUrls,
  listProjectFolders,
  listResources,
  listRevisions,
  listScopeItems,
  recordDeployment,
  rollbackDeployment,
  updateChangeOrder,
  updateDeliverableUrl,
  updateDeployment,
  updateRevision,
  updateScopeItem,
  upsertResource,
} from '../services/projectPhase23.js'
import { analyzeProject, generateProjectPlan, getProjectSummary, buildPhasesFromProgress } from '../services/projectIntelligence.js'
import { emitProjectActivity } from '../../shared/activity/emitActivityEvent.js'
import { hasRestrictedProjectScope, requireProjectMembership } from './staffAccess.js'

const router = Router()
router.use(requireCurvvtechAdmin)

function staffActor(req: { auth?: { sub?: string; email?: string } }): { actorId: string; actorName: string } {
  return { actorId: req.auth?.sub ?? 'system', actorName: req.auth?.email ?? 'Your team' }
}

/**
 * Keep progress_pct and the delivery roadmap in sync with real completion.
 * Progress is driven by milestone completion; a project marked "completed" is
 * always 100%. Projects with no milestones keep their manually-set progress.
 */
async function recomputeProjectProgress(projectId: string): Promise<void> {
  const row = firstRow<{ status?: string; total: number; done: number }>(await sql`
    SELECT p.status,
      (SELECT COUNT(*)::int FROM milestones m WHERE m.project_id = p.id) AS total,
      (SELECT COUNT(*)::int FROM milestones m WHERE m.project_id = p.id AND m.completed_at IS NOT NULL) AS done
    FROM projects p WHERE p.id = ${projectId}::uuid
  `)
  if (!row) return
  const total = Number(row.total ?? 0)
  const done = Number(row.done ?? 0)
  let progress: number
  if (String(row.status ?? '') === 'completed') progress = 100
  else if (total > 0) progress = Math.round((done / total) * 100)
  else return
  const phases = JSON.stringify(buildPhasesFromProgress(progress))
  await sql`
    UPDATE projects
    SET progress_pct = ${progress}, delivery_phases = ${phases}::jsonb, "updatedAt" = NOW()
    WHERE id = ${projectId}::uuid
  `
}

async function fetchProjectList(clientId?: string) {
  if (clientId) {
    return sql`
      SELECT p.*,
        c.name AS client_name,
        c.company AS client_company,
        c.website AS client_website,
        COALESCE(inv.collected_cents, 0)::bigint AS collected_cents,
        GREATEST(0, COALESCE(p.budget_cents, 0) - COALESCE(inv.collected_cents, 0))::bigint AS pending_cents,
        COALESCE(exp.expense_cents, 0)::bigint AS expense_cents,
        COALESCE(inv.collected_cents, 0) - COALESCE(exp.expense_cents, 0) AS profit_cents,
        COALESCE(ms.open_count, 0)::int AS open_milestones,
        mgr.email AS manager_email
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN LATERAL (
        SELECT SUM(total_cents) AS collected_cents
        FROM invoices WHERE project_id = p.id AND status = 'paid'
      ) inv ON true
      LEFT JOIN LATERAL (
        SELECT SUM(amount_cents) AS expense_cents
        FROM expenses WHERE project_id = p.id
      ) exp ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS open_count FROM milestones WHERE project_id = p.id AND completed_at IS NULL
      ) ms ON true
      LEFT JOIN LATERAL (
        SELECT u.email FROM project_members pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = p.id AND pm.role IN ('manager', 'project_manager', 'lead')
        LIMIT 1
      ) mgr ON true
      WHERE p.client_id = ${clientId}::uuid
      ORDER BY p."updatedAt" DESC
    `
  }
  return sql`
    SELECT p.*,
      c.name AS client_name,
      c.company AS client_company,
      c.website AS client_website,
      COALESCE(inv.collected_cents, 0)::bigint AS collected_cents,
      GREATEST(0, COALESCE(p.budget_cents, 0) - COALESCE(inv.collected_cents, 0))::bigint AS pending_cents,
      COALESCE(exp.expense_cents, 0)::bigint AS expense_cents,
      COALESCE(inv.collected_cents, 0) - COALESCE(exp.expense_cents, 0) AS profit_cents,
      COALESCE(ms.open_count, 0)::int AS open_milestones,
      mgr.email AS manager_email
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN LATERAL (
      SELECT SUM(total_cents) AS collected_cents
      FROM invoices WHERE project_id = p.id AND status = 'paid'
    ) inv ON true
    LEFT JOIN LATERAL (
      SELECT SUM(amount_cents) AS expense_cents
      FROM expenses WHERE project_id = p.id
    ) exp ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS open_count FROM milestones WHERE project_id = p.id AND completed_at IS NULL
    ) ms ON true
    LEFT JOIN LATERAL (
      SELECT u.email FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = p.id AND pm.role IN ('manager', 'project_manager', 'lead')
      LIMIT 1
    ) mgr ON true
    ORDER BY p."updatedAt" DESC
  `
}

router.get('/stats', async (_req, res) => {
  try {
    if (hasRestrictedProjectScope(_req)) {
      const scoped = firstRow<{
        total: string
        active: string
        completed: string
        in_progress: string
        archived: string
      }>(await sql`
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE p.status IN ('active', 'planning', 'review') AND p.archived_at IS NULL)::text AS active,
          COUNT(*) FILTER (WHERE p.status = 'completed')::text AS completed,
          COUNT(*) FILTER (WHERE p.status = 'in_progress')::text AS in_progress,
          COUNT(*) FILTER (WHERE p.archived_at IS NOT NULL)::text AS archived
        FROM projects p
        JOIN project_members pm ON pm.project_id = p.id
        WHERE pm.user_id = ${_req.auth!.sub}::uuid
      `)
      res.json({
        total: Number(scoped?.total ?? 0),
        active: Number(scoped?.active ?? 0),
        completed: Number(scoped?.completed ?? 0),
        in_progress: Number(scoped?.in_progress ?? 0),
        archived: Number(scoped?.archived ?? 0),
        total_budget_cents: 0,
        total_collected_cents: 0,
        total_pending_cents: 0,
      })
      return
    }
    const row = firstRow<{
      total: string
      active: string
      completed: string
      in_progress: string
      archived: string
      total_budget_cents: string
      total_collected_cents: string
      total_pending_cents: string
    }>(await sql`
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status IN ('active', 'planning', 'review') AND archived_at IS NULL)::text AS active,
        COUNT(*) FILTER (WHERE status = 'completed')::text AS completed,
        COUNT(*) FILTER (WHERE status = 'in_progress')::text AS in_progress,
        COUNT(*) FILTER (WHERE archived_at IS NOT NULL)::text AS archived,
        COALESCE(SUM(budget_cents), 0)::text AS total_budget_cents,
        COALESCE((
          SELECT SUM(i.total_cents) FROM invoices i
          JOIN projects p2 ON p2.id = i.project_id WHERE i.status = 'paid'
        ), 0)::text AS total_collected_cents,
        COALESCE(SUM(budget_cents), 0) - COALESCE((
          SELECT SUM(i.total_cents) FROM invoices i
          JOIN projects p2 ON p2.id = i.project_id WHERE i.status = 'paid'
        ), 0) AS total_pending_cents
      FROM projects
      WHERE archived_at IS NULL OR archived_at IS NOT NULL
    `)
    res.json({
      total: Number(row?.total ?? 0),
      active: Number(row?.active ?? 0),
      completed: Number(row?.completed ?? 0),
      in_progress: Number(row?.in_progress ?? 0),
      archived: Number(row?.archived ?? 0),
      total_budget_cents: Number(row?.total_budget_cents ?? 0),
      total_collected_cents: Number(row?.total_collected_cents ?? 0),
      total_pending_cents: Number(row?.total_pending_cents ?? 0),
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/bulk', async (req, res) => {
  try {
    if (hasRestrictedProjectScope(req)) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Restricted staff cannot bulk-edit projects' })
      return
    }
    const { action, ids } = req.body as { action?: string; ids?: string[] }
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'action and ids required' })
      return
    }
    const uuidList = ids.map((id) => `${id}`)
    if (action === 'archive') {
      await sql`
        UPDATE projects SET archived_at = NOW(), "updatedAt" = NOW()
        WHERE id = ANY(${uuidList}::uuid[]) AND archived_at IS NULL
      `
    } else if (action === 'unarchive') {
      await sql`
        UPDATE projects SET archived_at = NULL, "updatedAt" = NOW()
        WHERE id = ANY(${uuidList}::uuid[])
      `
    } else if (action === 'delete') {
      await sql`DELETE FROM projects WHERE id = ANY(${uuidList}::uuid[])`
    } else {
      res.status(400).json({ error: 'Unknown action' })
      return
    }
    res.json({ ok: true, action, count: ids.length })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/', async (req, res) => {
  try {
    const clientId = req.query.client_id as string | undefined
    const status = req.query.status as string | undefined
    const archived = req.query.archived as string | undefined
    const search = (req.query.search as string | undefined)?.trim().toLowerCase()

    let rows = await fetchProjectList(clientId)
    if (hasRestrictedProjectScope(req)) {
      const memberships = await sql`
        SELECT project_id::text
        FROM project_members
        WHERE user_id = ${req.auth!.sub}::uuid
      ` as { project_id: string }[]
      const allowed = new Set(memberships.map((m) => m.project_id))
      rows = rows.filter((r) => allowed.has(String((r as { id: string }).id)))
    }

    if (status) {
      rows = rows.filter((r) => String((r as { status?: string }).status) === status)
    }
    if (archived === 'true') {
      rows = rows.filter((r) => Boolean((r as { archived_at?: string }).archived_at))
    } else if (archived !== 'all') {
      rows = rows.filter((r) => !(r as { archived_at?: string }).archived_at)
    }
    if (search) {
      rows = rows.filter((r) => {
        const row = r as { name?: string; client_name?: string; client_company?: string; project_type?: string; tags?: string[] }
        const hay = `${row.name ?? ''} ${row.client_name ?? ''} ${row.client_company ?? ''} ${row.project_type ?? ''} ${(row.tags ?? []).join(' ')}`.toLowerCase()
        return hay.includes(search)
      })
    }
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/', async (req, res) => {
  try {
    if (hasRestrictedProjectScope(req)) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Restricted staff cannot create projects' })
      return
    }
    const { client_id, name, status, progress_pct, internal_notes } = req.body
    
    const row = firstRow<{ id: string } & Record<string, unknown>>(await sql`
      INSERT INTO projects (client_id, name, status, progress_pct, internal_notes, "updatedAt", "createdAt")
      VALUES (${client_id ?? ''}::uuid, ${name ?? ''}, ${status ?? 'planning'}, ${progress_pct ?? 0}, ${internal_notes ?? null}, NOW(), NOW())
      RETURNING *
    `)
    if (row?.id) {
      await seedProjectTimeline(String(row.id), String(name ?? ''))
      analyzeProject(String(row.id)).catch(() => {})
    }
    res.status(201).json(row!)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.use('/:id', requireProjectMembership)

router.get('/:id/summary', async (req, res) => {
  try {
    const summary = await getProjectSummary(req.params.id)
    if (!summary) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    res.json(summary)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/feed', async (req, res) => {
  try {
    const feed = await getProjectFeed(req.params.id)
    res.json(feed)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/activity', async (req, res) => {
  try {
    const events = await listProjectActivity(req.params.id)
    res.json(events)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/analyze', async (req, res) => {
  try {
    const auth = req.auth!
    const row = await analyzeProject(req.params.id, auth.sub)
    if (!row) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/generate-plan', async (req, res) => {
  try {
    const auth = req.auth!
    const plan = await generateProjectPlan(req.params.id, auth.sub)
    if (!plan) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    res.json(plan)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// ─── Phase 2: Finance, analytics, timeline, folders (before /:id) ───
router.get('/:id/finance', async (req, res) => {
  try {
    if (hasRestrictedProjectScope(req)) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Finance data is not available to restricted staff' })
      return
    }
    const data = await getProjectFinance(req.params.id)
    if (!data) { res.status(404).json({ error: 'Project not found' }); return }
    res.json(data)
  } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})

router.get('/:id/analytics', async (req, res) => {
  try {
    const data = await getProjectAnalytics(req.params.id)
    if (!data) { res.status(404).json({ error: 'Project not found' }); return }
    res.json(data)
  } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})

router.get('/:id/rich-timeline', async (req, res) => {
  try {
    const data = await getProjectRichTimeline(req.params.id)
    if (!data) { res.status(404).json({ error: 'Project not found' }); return }
    res.json(data)
  } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})

router.get('/:id/folders', async (req, res) => {
  try {
    const rows = await listProjectFolders(req.params.id)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})

router.get('/:id', async (req, res) => {
  try {
    
    const row = firstRow(await sql`
      SELECT p.*, c.name as client_name, c.email as client_email
      FROM projects p LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.id = ${req.params.id}::uuid
    `)
    if (!row) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      status,
      progress_pct,
      internal_notes,
      budget_cents,
      start_date,
      target_end_date,
      project_type,
      current_phase,
      live_url,
      repository_url,
      figma_url,
      priority,
      tags,
      color,
      is_internal,
      archived_at,
      completed_at,
      referred_by,
      quoted_cents,
      gst_cents,
      metadata,
    } = req.body

    const existing = firstRow<{ id: string; status: string | null; current_phase: string | null }>(
      await sql`SELECT id, status, current_phase FROM projects WHERE id = ${id}::uuid`,
    )
    if (!existing) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    await sql`
      UPDATE projects SET
        name = COALESCE(${name ?? null}, name),
        status = COALESCE(${status ?? null}, status),
        progress_pct = COALESCE(${progress_pct !== undefined ? progress_pct : null}, progress_pct),
        internal_notes = COALESCE(${internal_notes !== undefined ? internal_notes : null}, internal_notes),
        budget_cents = COALESCE(${budget_cents !== undefined ? budget_cents : null}, budget_cents),
        start_date = COALESCE(${start_date !== undefined ? start_date : null}, start_date),
        target_end_date = COALESCE(${target_end_date !== undefined ? target_end_date : null}, target_end_date),
        project_type = COALESCE(${project_type !== undefined ? project_type : null}, project_type),
        current_phase = COALESCE(${current_phase !== undefined ? current_phase : null}, current_phase),
        live_url = COALESCE(${live_url !== undefined ? live_url : null}, live_url),
        repository_url = COALESCE(${repository_url !== undefined ? repository_url : null}, repository_url),
        figma_url = COALESCE(${figma_url !== undefined ? figma_url : null}, figma_url),
        priority = COALESCE(${priority !== undefined ? priority : null}, priority),
        tags = COALESCE(${tags !== undefined ? tags : null}, tags),
        color = COALESCE(${color !== undefined ? color : null}, color),
        is_internal = COALESCE(${is_internal !== undefined ? is_internal : null}, is_internal),
        archived_at = COALESCE(${archived_at !== undefined ? archived_at : null}, archived_at),
        completed_at = COALESCE(${completed_at !== undefined ? completed_at : null}, completed_at),
        referred_by = COALESCE(${referred_by !== undefined ? referred_by : null}, referred_by),
        quoted_cents = COALESCE(${quoted_cents !== undefined ? quoted_cents : null}, quoted_cents),
        gst_cents = COALESCE(${gst_cents !== undefined ? gst_cents : null}, gst_cents),
        metadata = COALESCE(${metadata !== undefined ? metadata : null}::jsonb, metadata),
        "updatedAt" = NOW()
      WHERE id = ${id}::uuid
    `
    if (status === 'completed' && progress_pct === undefined) {
      await recomputeProjectProgress(id)
    }
    const actor = staffActor(req)
    if (current_phase !== undefined && current_phase && current_phase !== existing.current_phase) {
      await emitProjectActivity(id, {
        ...actor,
        eventType: 'project.phase_changed',
        entityType: 'project',
        entityId: id,
        title: `Project moved to ${String(current_phase).replace(/_/g, ' ')}`,
      })
    }
    if (status && status !== existing.status && status === 'completed') {
      await emitProjectActivity(id, {
        ...actor,
        eventType: 'project.completed',
        entityType: 'project',
        entityId: id,
        title: 'Project marked complete',
      })
    }
    const row = firstRow(await sql`SELECT * FROM projects WHERE id = ${id}::uuid`)
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// Milestones
router.get('/:id/milestones', async (req, res) => {
  try {
    
    const rows = await sql`SELECT * FROM milestones WHERE project_id = ${req.params.id}::uuid ORDER BY due_at ASC NULLS LAST, "createdAt" ASC`
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/milestones', async (req, res) => {
  try {
    const auth = req.auth!
    const { title, due_at } = req.body
    
    const row = firstRow(await sql`
      INSERT INTO milestones (project_id, title, due_at, "createdAt")
      VALUES (${req.params.id}::uuid, ${title ?? ''}, ${due_at ?? null}, NOW())
      RETURNING *
    `)
    await logProjectActivity(req.params.id, 'milestone_created', `Milestone: ${title ?? 'Untitled'}`, due_at ? `Due ${due_at}` : null, auth.sub)
    await recomputeProjectProgress(req.params.id)
    res.status(201).json(row!)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/:id/milestones/:mid', async (req, res) => {
  try {
    const { mid } = req.params
    const { title, due_at, completed_at, description, completion_pct, status } = req.body

    const existing = firstRow(await sql`SELECT id FROM milestones WHERE id = ${mid}::uuid`)
    if (!existing) {
      res.status(404).json({ error: 'Milestone not found' })
      return
    }
    await sql`
      UPDATE milestones SET
        title = COALESCE(${title ?? null}, title),
        due_at = COALESCE(${due_at !== undefined ? due_at : null}, due_at),
        completed_at = COALESCE(${completed_at !== undefined ? completed_at : null}, completed_at),
        description = COALESCE(${description !== undefined ? description : null}, description),
        completion_pct = COALESCE(${completion_pct !== undefined ? completion_pct : null}, completion_pct),
        status = COALESCE(${status !== undefined ? status : null}, status),
        "createdAt" = "createdAt"
      WHERE id = ${mid}::uuid
    `
    const row = firstRow<{ id: string; title?: string }>(await sql`SELECT * FROM milestones WHERE id = ${mid}::uuid`)
    if (completed_at && row?.title) {
      await logProjectActivity(req.params.id, 'milestone_completed', `${row.title} completed`, null, req.auth?.sub)
      await emitProjectActivity(req.params.id, {
        ...staffActor(req),
        eventType: 'milestone.completed',
        entityType: 'milestone',
        entityId: mid,
        title: `Milestone completed: ${row.title}`,
      })
    }
    await recomputeProjectProgress(req.params.id)
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// Updates (client-visible progress)
router.get('/:id/updates', async (req, res) => {
  try {
    
    const rows = await sql`SELECT * FROM updates WHERE project_id = ${req.params.id}::uuid ORDER BY "createdAt" DESC`
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/updates', async (req, res) => {
  try {
    const auth = req.auth!
    const { body: updateBody, visibility, note_type } = req.body
    const noteType = note_type ?? (visibility === 'client' ? 'client' : 'internal')

    const result = await sql`
      INSERT INTO updates (project_id, author_clerk_id, body, visibility, note_type, "createdAt")
      VALUES (${req.params.id}::uuid, ${auth.sub}, ${updateBody ?? ''}, ${visibility ?? 'internal'}, ${noteType}, NOW())
      RETURNING *
    `
    const row = firstRow<{ id: string }>(result)
    const labels: Record<string, string> = { internal: 'Internal note', client: 'Client update', meeting: 'Meeting note', ai: 'AI note' }
    await logProjectActivity(req.params.id, 'note_posted', labels[noteType] ?? 'Note posted', String(updateBody ?? '').slice(0, 120), auth.sub)
    if (visibility === 'client' || noteType === 'client') {
      await emitProjectActivity(req.params.id, {
        ...staffActor(req),
        eventType: 'update.posted',
        entityType: 'update',
        entityId: row?.id,
        title: 'Posted a project update',
        body: String(updateBody ?? '').slice(0, 500),
      })
    }
    res.status(201).json(row!)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/members', async (req, res) => {
  try {
    const rows = await sql`
      SELECT pm.*, u.email, u.curvvtech_role
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ${req.params.id}::uuid
    `
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/members', async (req, res) => {
  try {
    const auth = req.auth!
    const { user_id, role } = req.body
    const member = firstRow<{ email?: string }>(
      await sql`SELECT email FROM users WHERE id = ${user_id}::uuid`,
    )
    const row = firstRow(await sql`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES (${req.params.id}::uuid, ${user_id}::uuid, ${role ?? 'member'})
      ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role
      RETURNING *
    `)
    await logProjectActivity(req.params.id, 'member_assigned', `Assigned ${member?.email ?? 'team member'}`, role ?? 'member', auth.sub)
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.delete('/:id/members/:userId', async (req, res) => {
  try {
    await sql`DELETE FROM project_members WHERE project_id = ${req.params.id}::uuid AND user_id = ${req.params.userId}::uuid`
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/folders/bootstrap', async (req, res) => {
  try {
    const rows = await bootstrapProjectFolders(req.params.id, req.auth?.sub)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})

// ─── Phase 3: Revisions ───
router.get('/:id/revisions', async (req, res) => {
  try { res.json(await listRevisions(req.params.id)) } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})
router.post('/:id/revisions', async (req, res) => {
  try {
    const row = await createRevision(req.params.id, req.body, req.auth?.sub)
    res.status(201).json(row)
  } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})
router.patch('/:id/revisions/:rid', async (req, res) => {
  try {
    const row = await updateRevision(req.params.id, req.params.rid, req.body)
    const status = (req.body as { status?: string }).status
    const approved = (req.body as { approved?: boolean }).approved
    if (status || approved !== undefined) {
      const label = approved === true ? 'completed' : status ?? 'updated'
      await emitProjectActivity(req.params.id, {
        ...staffActor(req),
        eventType: `revision.${label}`,
        entityType: 'revision',
        entityId: req.params.rid,
        title: `Revision ${label}`,
        body: (row as { description?: string } | null)?.description?.slice(0, 300) ?? null,
      })
    }
    res.json(row)
  } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})
router.delete('/:id/revisions/:rid', async (req, res) => {
  try { await deleteRevision(req.params.id, req.params.rid); res.status(204).end() } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})

// ─── Change orders ───
router.get('/:id/change-orders', async (req, res) => {
  try { res.json(await listChangeOrders(req.params.id)) } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})
router.post('/:id/change-orders', async (req, res) => {
  try {
    const row = await createChangeOrder(req.params.id, req.body, req.auth?.sub)
    res.status(201).json(row)
  } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})
router.patch('/:id/change-orders/:cid', async (req, res) => {
  try { res.json(await updateChangeOrder(req.params.id, req.params.cid, req.body)) } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})

// ─── Scope ───
router.get('/:id/scope', async (req, res) => {
  try { res.json(await listScopeItems(req.params.id)) } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})
router.post('/:id/scope', async (req, res) => {
  try { res.status(201).json(await createScopeItem(req.params.id, req.body)) } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})
router.patch('/:id/scope/:sid', async (req, res) => {
  try { res.json(await updateScopeItem(req.params.id, req.params.sid, req.body)) } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})
router.delete('/:id/scope/:sid', async (req, res) => {
  try { await deleteScopeItem(req.params.id, req.params.sid); res.status(204).end() } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})

// ─── Resources ───
router.get('/:id/resources', async (req, res) => {
  try { res.json(await listResources(req.params.id)) } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})
router.post('/:id/resources', async (req, res) => {
  try { res.status(201).json(await upsertResource(req.params.id, req.body)) } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})
router.delete('/:id/resources/:rid', async (req, res) => {
  try { await deleteResource(req.params.id, req.params.rid); res.status(204).end() } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})

// ─── Deployment ───
router.get('/:id/deployment', async (req, res) => {
  try { res.json(await getDeployment(req.params.id)) } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})
router.patch('/:id/deployment', async (req, res) => {
  try { res.json(await updateDeployment(req.params.id, req.body)) } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})
router.post('/:id/deployment/deploy', async (req, res) => {
  try { res.status(201).json(await recordDeployment(req.params.id, req.body, req.auth?.sub)) } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})
router.post('/:id/deployment/rollback', async (req, res) => {
  try {
    const row = await rollbackDeployment(req.params.id, String(req.body.history_id ?? ''), req.auth?.sub)
    if (!row) { res.status(404).json({ error: 'History entry not found' }); return }
    res.json(row)
  } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})

// ─── Deliverable website URLs ───
router.get('/:id/deliverable-urls', async (req, res) => {
  try { res.json({ urls: await listDeliverableUrls(req.params.id) }) } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})
router.post('/:id/deliverable-urls', async (req, res) => {
  try { res.status(201).json(await createDeliverableUrl(req.params.id, req.body)) } catch (e) { res.status(400).json({ error: (e as Error).message }) }
})
router.patch('/:id/deliverable-urls/:urlId', async (req, res) => {
  try {
    const row = await updateDeliverableUrl(req.params.id, req.params.urlId, req.body)
    if (!row) { res.status(404).json({ error: 'URL not found' }); return }
    res.json(row)
  } catch (e) { res.status(400).json({ error: (e as Error).message }) }
})
router.delete('/:id/deliverable-urls/:urlId', async (req, res) => {
  try {
    const ok = await deleteDeliverableUrl(req.params.id, req.params.urlId)
    if (!ok) { res.status(404).json({ error: 'URL not found' }); return }
    res.status(204).end()
  } catch (e) { res.status(500).json({ error: (e as Error).message }) }
})

export default router
