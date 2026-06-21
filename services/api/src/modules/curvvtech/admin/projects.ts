import { Router } from 'express'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'
import { logProjectActivity, listProjectActivity, seedProjectTimeline } from '../services/projectActivity.js'
import { analyzeProject, generateProjectPlan, getProjectSummary } from '../services/projectIntelligence.js'

const router = Router()
router.use(requireCurvvtechAdmin)

router.get('/', async (req, res) => {
  try {
    const clientId = req.query.client_id as string | undefined
    
    const rows = clientId
      ? await sql`SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.client_id = ${clientId}::uuid ORDER BY p."updatedAt" DESC`
      : await sql`SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id ORDER BY p."updatedAt" DESC`
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/', async (req, res) => {
  try {
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
    const { name, status, progress_pct, internal_notes, budget_cents, start_date, target_end_date } = req.body
    
    const existing = firstRow(await sql`SELECT id FROM projects WHERE id = ${id}::uuid`)
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
        "updatedAt" = NOW()
      WHERE id = ${id}::uuid
    `
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
    res.status(201).json(row!)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/:id/milestones/:mid', async (req, res) => {
  try {
    const { mid } = req.params
    const { title, due_at, completed_at } = req.body
    
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
        "createdAt" = "createdAt"
      WHERE id = ${mid}::uuid
    `
    const row = firstRow<{ id: string; title?: string }>(await sql`SELECT * FROM milestones WHERE id = ${mid}::uuid`)
    if (completed_at && row?.title) {
      await logProjectActivity(req.params.id, 'milestone_completed', `${row.title} completed`, null, req.auth?.sub)
    }
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
    const row = firstRow(result)
    const labels: Record<string, string> = { internal: 'Internal note', client: 'Client update', meeting: 'Meeting note', ai: 'AI note' }
    await logProjectActivity(req.params.id, 'note_posted', labels[noteType] ?? 'Note posted', String(updateBody ?? '').slice(0, 120), auth.sub)
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

export default router
