import { Router } from 'express'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'

const router = Router()
router.use(requireCurvvtechAdmin)

router.get('/', async (req, res) => {
  try {
    const status = req.query.status as string | undefined
    
    const rows = status
      ? await sql`
          SELECT i.*, c.name as client_name
          FROM invoices i LEFT JOIN clients c ON i.client_id = c.id
          WHERE i.status = ${status}
          ORDER BY i."createdAt" DESC
        `
      : await sql`
          SELECT i.*, c.name as client_name
          FROM invoices i LEFT JOIN clients c ON i.client_id = c.id
          ORDER BY i."createdAt" DESC
        `
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { client_id, invoice_number, status, amount_cents, tax_cents, due_at, payment_link } = req.body
    
    const row = firstRow(await sql`
      INSERT INTO invoices (client_id, invoice_number, status, amount_cents, tax_cents, due_at, payment_link, "updatedAt", "createdAt")
      VALUES (${client_id ?? null}::uuid, ${invoice_number ?? ''}, ${status ?? 'draft'}, ${amount_cents ?? 0}, ${tax_cents ?? 0}, ${due_at ?? null}, ${payment_link ?? null}, NOW(), NOW())
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
      SELECT i.*, c.name as client_name, c.email as client_email, c.company as client_company
      FROM invoices i LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.id = ${req.params.id}::uuid
    `)
    if (!row) {
      res.status(404).json({ error: 'Invoice not found' })
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
    const { status, amount_cents, tax_cents, due_at, paid_at, payment_link } = req.body
    
    const existing = firstRow(await sql`SELECT id FROM invoices WHERE id = ${id}::uuid`)
    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' })
      return
    }
    await sql`
      UPDATE invoices SET
        status = COALESCE(${status ?? null}, status),
        amount_cents = COALESCE(${amount_cents !== undefined ? amount_cents : null}, amount_cents),
        tax_cents = COALESCE(${tax_cents !== undefined ? tax_cents : null}, tax_cents),
        due_at = COALESCE(${due_at !== undefined ? due_at : null}, due_at),
        paid_at = COALESCE(${paid_at !== undefined ? paid_at : null}, paid_at),
        payment_link = COALESCE(${payment_link !== undefined ? payment_link : null}, payment_link),
        "updatedAt" = NOW()
      WHERE id = ${id}::uuid
    `
    const row = firstRow(await sql`SELECT * FROM invoices WHERE id = ${id}::uuid`)
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/items', async (req, res) => {
  try {
    
    const rows = await sql`SELECT * FROM invoice_items WHERE invoice_id = ${req.params.id}::uuid ORDER BY "createdAt" ASC`
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/items', async (req, res) => {
  try {
    const { description, quantity, unit_price_cents } = req.body
    
    const row = firstRow(await sql`
      INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_cents, "createdAt")
      VALUES (${req.params.id}::uuid, ${description ?? ''}, ${quantity ?? 1}, ${unit_price_cents ?? 0}, NOW())
      RETURNING *
    `)
    res.status(201).json(row!)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
