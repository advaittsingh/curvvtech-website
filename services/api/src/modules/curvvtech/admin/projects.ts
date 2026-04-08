import { Router } from 'express'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'

const router = Router()
router.use(requireCurvvtechAdmin)

router.get('/', async (req, res) => {
  try {
    const clientId = req.query.client_id as string | undefined
    
    const rows = clientId
      ? await sql`SELECT * FROM projects WHERE client_id = ${clientId}::uuid ORDER BY "updatedAt" DESC`
      : await sql`SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id ORDER BY p."updatedAt" DESC`
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { client_id, name, status, progress_pct, internal_notes } = req.body
    
    const row = firstRow(await sql`
      INSERT INTO projects (client_id, name, status, progress_pct, internal_notes, "updatedAt", "createdAt")
      VALUES (${client_id ?? ''}::uuid, ${name ?? ''}, ${status ?? 'active'}, ${progress_pct ?? 0}, ${internal_notes ?? null}, NOW(), NOW())
      RETURNING *
    `)
    res.status(201).json(row!)
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
    const { name, status, progress_pct, internal_notes } = req.body
    
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
    const { title, due_at } = req.body
    
    const row = firstRow(await sql`
      INSERT INTO milestones (project_id, title, due_at, "createdAt")
      VALUES (${req.params.id}::uuid, ${title ?? ''}, ${due_at ?? null}, NOW())
      RETURNING *
    `)
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
    const row = firstRow(await sql`SELECT * FROM milestones WHERE id = ${mid}::uuid`)
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
    const { body: updateBody, visibility } = req.body

    const result = await sql`
      INSERT INTO updates (project_id, author_clerk_id, body, visibility, "createdAt")
      VALUES (${req.params.id}::uuid, ${auth.sub}, ${updateBody ?? ''}, ${visibility ?? 'internal'}, NOW())
      RETURNING *
    `
    const row = firstRow(result)
    res.status(201).json(row!)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
