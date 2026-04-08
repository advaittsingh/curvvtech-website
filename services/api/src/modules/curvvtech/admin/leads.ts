import { Router } from 'express'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'

const router = Router()
router.use(requireCurvvtechAdmin)

router.get('/', async (req, res) => {
  try {
    const status = req.query.status as string | undefined
    
    const rows = status
      ? await sql`SELECT * FROM crm_leads WHERE status = ${status} ORDER BY "createdAt" DESC`
      : await sql`SELECT * FROM crm_leads ORDER BY "createdAt" DESC`
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { source, name, email, phone, company, message, status } = req.body
    
    const result = await sql`
      INSERT INTO crm_leads (source, name, email, phone, company, message, status)
      VALUES (${source ?? 'contact'}, ${name ?? null}, ${email ?? null}, ${phone ?? null}, ${company ?? null}, ${message ?? null}, ${status ?? 'new'})
      RETURNING *
    `
    res.status(201).json(firstRow(result)!)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status, assigned_to_clerk_id } = req.body
    
    const existing = firstRow(await sql`SELECT id FROM crm_leads WHERE id = ${id}::uuid`)
    if (!existing) {
      res.status(404).json({ error: 'Lead not found' })
      return
    }
    if (status !== undefined) {
      await sql`UPDATE crm_leads SET status = ${status}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    }
    if (assigned_to_clerk_id !== undefined) {
      await sql`UPDATE crm_leads SET assigned_to_clerk_id = ${assigned_to_clerk_id}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    }
    const row = firstRow(await sql`SELECT * FROM crm_leads WHERE id = ${id}::uuid`)
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/notes', async (req, res) => {
  try {
    
    const rows = await sql`SELECT * FROM crm_lead_notes WHERE lead_id = ${req.params.id}::uuid ORDER BY "createdAt" DESC`
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/notes', async (req, res) => {
  try {
    const auth = req.auth!
    const { body: noteBody, is_internal } = req.body

    const row = firstRow(await sql`
      INSERT INTO crm_lead_notes (lead_id, author_clerk_id, body, is_internal)
      VALUES (${req.params.id}::uuid, ${auth.sub}, ${noteBody ?? ''}, ${is_internal !== false})
      RETURNING *
    `)
    res.status(201).json(row!)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
