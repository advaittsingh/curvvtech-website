import { Router } from 'express'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'

const router = Router()
router.use(requireCurvvtechAdmin)

router.get('/', async (_req, res) => {
  try {
    
    const rows = await sql`
      SELECT * FROM clients ORDER BY "updatedAt" DESC
    `
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, email, company, contract_value_cents, status, notes } = req.body
    
    const row = firstRow(await sql`
      INSERT INTO clients (name, email, company, contract_value_cents, status, notes, "updatedAt", "createdAt")
      VALUES (${name ?? ''}, ${email ?? null}, ${company ?? null}, ${contract_value_cents ?? null}, ${status ?? 'active'}, ${notes ?? null}, NOW(), NOW())
      RETURNING *
    `)
    res.status(201).json(row!)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    
    const row = firstRow(await sql`SELECT * FROM clients WHERE id = ${req.params.id}::uuid`)
    if (!row) {
      res.status(404).json({ error: 'Client not found' })
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
    const { name, email, company, contract_value_cents, status, notes } = req.body
    
    const existing = firstRow(await sql`SELECT id FROM clients WHERE id = ${id}::uuid`)
    if (!existing) {
      res.status(404).json({ error: 'Client not found' })
      return
    }
    await sql`
      UPDATE clients SET
        name = COALESCE(${name ?? null}, name),
        email = COALESCE(${email !== undefined ? email : null}, email),
        company = COALESCE(${company !== undefined ? company : null}, company),
        contract_value_cents = COALESCE(${contract_value_cents !== undefined ? contract_value_cents : null}, contract_value_cents),
        status = COALESCE(${status ?? null}, status),
        notes = COALESCE(${notes !== undefined ? notes : null}, notes),
        "updatedAt" = NOW()
      WHERE id = ${id}::uuid
    `
    const row = firstRow(await sql`SELECT * FROM clients WHERE id = ${id}::uuid`)
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/projects', async (req, res) => {
  try {
    
    const rows = await sql`
      SELECT * FROM projects WHERE client_id = ${req.params.id}::uuid ORDER BY "updatedAt" DESC
    `
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
