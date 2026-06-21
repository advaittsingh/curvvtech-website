import { Router } from 'express'
import { pool } from '../../../db.js'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'

const router = Router()
router.use(requireCurvvtechAdmin)

const INV_AMT = 'COALESCE(i.total_cents, i.amount_cents, 0)'

function computeHealthScore(input: {
  outstandingCents: number
  totalBilledCents: number
  daysSinceContact: number | null
  activeProjects: number
  invoicesPending: number
}): number {
  let score = 100
  if (input.totalBilledCents > 0) {
    const ratio = input.outstandingCents / input.totalBilledCents
    if (ratio > 0.5) score -= 25
    else if (ratio > 0.2) score -= 15
    else if (ratio > 0) score -= 5
  }
  if (input.daysSinceContact === null) score -= 15
  else if (input.daysSinceContact > 14) score -= 20
  else if (input.daysSinceContact > 7) score -= 10
  if (input.invoicesPending >= 2) score -= 10
  if (input.activeProjects === 0 && input.totalBilledCents > 0) score -= 5
  return Math.max(0, Math.min(100, Math.round(score)))
}

router.get('/', async (_req, res) => {
  try {
    const rows = await sql`SELECT * FROM clients ORDER BY "updatedAt" DESC`
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

router.get('/:id/summary', async (req, res) => {
  try {
    const id = req.params.id
    const client = firstRow(await sql`SELECT id::text FROM clients WHERE id = ${id}::uuid`)
    if (!client) {
      res.status(404).json({ error: 'Client not found' })
      return
    }

    const invResult = await pool.query(
      `SELECT
        COALESCE(SUM(${INV_AMT}) FILTER (WHERE i.status = 'paid'), 0)::bigint AS lifetime_revenue_cents,
        COALESCE(SUM(${INV_AMT}) FILTER (WHERE i.status NOT IN ('paid', 'cancelled', 'draft')), 0)::bigint AS outstanding_cents,
        COALESCE(SUM(${INV_AMT}), 0)::bigint AS total_billed_cents,
        COALESCE(SUM(${INV_AMT}) FILTER (WHERE i.status = 'paid'), 0)::bigint AS total_received_cents,
        COUNT(*) FILTER (WHERE i.status NOT IN ('paid', 'cancelled', 'draft'))::int AS invoices_pending
      FROM invoices i WHERE i.client_id = $1::uuid`,
      [id],
    )
    const inv = invResult.rows[0] as Record<string, unknown>

    const projResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled'))::int AS active_count,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count
      FROM projects WHERE client_id = $1::uuid`,
      [id],
    )
    const proj = projResult.rows[0] as Record<string, unknown>

    const commResult = await pool.query(
      `SELECT MAX("createdAt") AS last_at FROM client_communications WHERE client_id = $1::uuid`,
      [id],
    )
    const lastAt = commResult.rows[0]?.last_at as string | null
    const daysSinceContact = lastAt
      ? Math.floor((Date.now() - new Date(lastAt).getTime()) / (1000 * 60 * 60 * 24))
      : null

    const outstandingCents = Number(inv.outstanding_cents ?? 0)
    const totalBilledCents = Number(inv.total_billed_cents ?? 0)

    res.json({
      lifetime_revenue_cents: Number(inv.lifetime_revenue_cents ?? 0),
      outstanding_cents: outstandingCents,
      total_billed_cents: totalBilledCents,
      total_received_cents: Number(inv.total_received_cents ?? 0),
      invoices_pending: Number(inv.invoices_pending ?? 0),
      projects_active: Number(proj.active_count ?? 0),
      projects_completed: Number(proj.completed_count ?? 0),
      last_interaction_at: lastAt,
      health_score: computeHealthScore({
        outstandingCents,
        totalBilledCents,
        daysSinceContact,
        activeProjects: Number(proj.active_count ?? 0),
        invoicesPending: Number(inv.invoices_pending ?? 0),
      }),
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/invoices', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, ${INV_AMT} AS display_total_cents
       FROM invoices i
       WHERE i.client_id = $1::uuid
       ORDER BY i."createdAt" DESC`,
      [req.params.id],
    )
    const rows = result.rows.map((r) => ({
      ...r,
      total_cents: Number(r.display_total_cents ?? r.total_cents ?? r.amount_cents ?? 0),
    }))
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/payments', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.id::text, i.invoice_number, i.status, i.paid_at, i.razorpay_order_id,
              ${INV_AMT} AS amount_cents, i."createdAt"
       FROM invoices i
       WHERE i.client_id = $1::uuid AND i.status = 'paid'
       ORDER BY COALESCE(i.paid_at, i."createdAt") DESC`,
      [req.params.id],
    )
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        invoice_number: r.invoice_number,
        amount_cents: Number(r.amount_cents ?? 0),
        paid_at: r.paid_at,
        provider: r.razorpay_order_id ? 'Razorpay' : 'Manual',
        status: 'paid',
      })),
    )
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/timeline', async (req, res) => {
  try {
    const id = req.params.id
    const client = firstRow<{ createdAt: string; name: string }>(
      await sql`SELECT "createdAt", name FROM clients WHERE id = ${id}::uuid`,
    )
    if (!client) {
      res.status(404).json({ error: 'Client not found' })
      return
    }

    type Ev = { id: string; type: string; message: string; created_at: string }
    const events: Ev[] = []

    const lead = firstRow<{ id: string; updatedAt: string }>(await sql`
      SELECT id::text, "updatedAt" FROM crm_leads WHERE converted_client_id = ${id}::uuid LIMIT 1
    `)
    if (lead) {
      events.push({
        id: `lead-won-${lead.id}`,
        type: 'lead_won',
        message: 'Lead marked won',
        created_at: String(lead.updatedAt),
      })
    }

    events.push({
      id: `client-${id}`,
      type: 'client_created',
      message: `Client created — ${client.name}`,
      created_at: String(client.createdAt),
    })

    const projects = (await sql`
      SELECT id::text, name, status, "createdAt" FROM projects WHERE client_id = ${id}::uuid ORDER BY "createdAt" ASC
    `) as { id: string; name: string; status: string; createdAt: string }[]

    for (const p of projects) {
      events.push({
        id: `project-${p.id}`,
        type: 'project_created',
        message: `Project created — ${p.name}`,
        created_at: String(p.createdAt),
      })
      if (p.status === 'completed') {
        events.push({
          id: `project-delivered-${p.id}`,
          type: 'project_delivered',
          message: `Project delivered — ${p.name}`,
          created_at: String(p.createdAt),
        })
      }
    }

    const invResult = await pool.query(
      `SELECT id::text, invoice_number, status, paid_at, "createdAt"
       FROM invoices WHERE client_id = $1::uuid ORDER BY "createdAt" ASC`,
      [id],
    )
    for (const inv of invResult.rows) {
      events.push({
        id: `invoice-${inv.id}`,
        type: 'invoice_generated',
        message: `Invoice ${inv.invoice_number || 'draft'} created`,
        created_at: String(inv.createdAt),
      })
      if (inv.status === 'sent') {
        events.push({
          id: `invoice-sent-${inv.id}`,
          type: 'invoice_sent',
          message: `Invoice ${inv.invoice_number || ''} sent`,
          created_at: String(inv.createdAt),
        })
      }
      if (inv.status === 'paid' && inv.paid_at) {
        events.push({
          id: `payment-${inv.id}`,
          type: 'payment_received',
          message: `Payment received — ${inv.invoice_number || 'invoice'}`,
          created_at: String(inv.paid_at),
        })
      }
    }

    events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    res.json(events)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/notes', async (req, res) => {
  try {
    const rows = await sql`
      SELECT n.*, u.email AS author_email
      FROM client_notes n
      LEFT JOIN users u ON u.id::text = n.author_user_id
      WHERE n.client_id = ${req.params.id}::uuid
      ORDER BY n."createdAt" DESC
    `
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/notes', async (req, res) => {
  try {
    const auth = req.auth!
    const { body: noteBody } = req.body
    const row = firstRow(await sql`
      INSERT INTO client_notes (client_id, author_user_id, body)
      VALUES (${req.params.id}::uuid, ${auth.sub}, ${noteBody ?? ''})
      RETURNING *
    `)
    res.status(201).json(row!)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/projects', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
        (SELECT u.email FROM project_members pm
         JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = p.id
         ORDER BY CASE WHEN pm.role = 'manager' THEN 0 ELSE 1 END
         LIMIT 1) AS manager_email
       FROM projects p
       WHERE p.client_id = $1::uuid
       ORDER BY p."updatedAt" DESC`,
      [req.params.id],
    )
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/communications', async (req, res) => {
  try {
    const rows = await sql`
      SELECT c.*, u.email AS author_email
      FROM client_communications c
      LEFT JOIN users u ON u.id::text = c.author_user_id
      WHERE c.client_id = ${req.params.id}::uuid
      ORDER BY c."createdAt" DESC
    `
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/communications', async (req, res) => {
  try {
    const auth = req.auth!
    const { channel, subject, body } = req.body
    const row = firstRow(await sql`
      INSERT INTO client_communications (client_id, channel, subject, body, author_user_id)
      VALUES (${req.params.id}::uuid, ${channel ?? 'email'}, ${subject ?? null}, ${body ?? ''}, ${auth.sub})
      RETURNING *
    `)
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const row = firstRow(await sql`
      SELECT c.*,
        l.id::text AS source_lead_id,
        l.name AS source_lead_name,
        u.email AS account_manager_email
      FROM clients c
      LEFT JOIN crm_leads l ON l.converted_client_id = c.id
      LEFT JOIN users u ON u.id::text = c.account_manager_id
      WHERE c.id = ${req.params.id}::uuid
    `)
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
    const body = req.body

    const existing = firstRow(await sql`SELECT id FROM clients WHERE id = ${id}::uuid`)
    if (!existing) {
      res.status(404).json({ error: 'Client not found' })
      return
    }

    const fields: [string, unknown][] = [
      ['name', body.name],
      ['email', body.email],
      ['phone', body.phone],
      ['company', body.company],
      ['industry', body.industry],
      ['website', body.website],
      ['gst_number', body.gst_number],
      ['address', body.address],
      ['contract_value_cents', body.contract_value_cents],
      ['status', body.status],
      ['notes', body.notes],
      ['account_manager_id', body.account_manager_id],
      ['portal_status', body.portal_status],
      ['portal_last_login_at', body.portal_last_login_at],
    ]

    for (const [col, val] of fields) {
      if (val !== undefined) {
        await pool.query(`UPDATE clients SET "${col}" = $1, "updatedAt" = NOW() WHERE id = $2::uuid`, [val, id])
      }
    }

    const row = firstRow(await sql`
      SELECT c.*,
        l.id::text AS source_lead_id,
        l.name AS source_lead_name,
        u.email AS account_manager_email
      FROM clients c
      LEFT JOIN crm_leads l ON l.converted_client_id = c.id
      LEFT JOIN users u ON u.id::text = c.account_manager_id
      WHERE c.id = ${id}::uuid
    `)
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
