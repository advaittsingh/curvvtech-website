import { Router } from 'express'
import { pool } from '../../../db.js'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'
import { escapeHtml } from '../../../lib/escapeHtml.js'
import { recalculateInvoiceTotals } from '../services/invoiceRecalculate.js'
import { buildInvoiceTimeline, getInvoiceFinanceInsight } from '../services/invoiceIntelligence.js'
import { createRazorpayOrder } from '../../billing/razorpayCheckout.js'
import { razorpayConfigured } from '../../billing/razorpayClient.js'

const router = Router()
router.use(requireCurvvtechAdmin)

const INVOICE_LIST = `
  SELECT
    i.*,
    c.name AS client_name,
    p.name AS project_name,
    CASE
      WHEN i.status NOT IN ('paid', 'cancelled')
        AND i.due_at IS NOT NULL AND i.due_at < NOW()
      THEN 'overdue'
      WHEN i.status = 'sent' THEN 'pending'
      ELSE i.status
    END AS display_status
  FROM invoices i
  LEFT JOIN clients c ON c.id = i.client_id
  LEFT JOIN projects p ON p.id = i.project_id
`

async function logInvoiceActivity(
  authSub: string,
  action: string,
  invoiceId: string,
  details: Record<string, unknown>,
): Promise<void> {
  await sql`
    INSERT INTO activity_logs (clerk_user_id, action, entity_type, entity_id, details)
    VALUES (${authSub}, ${action}, 'invoice', ${invoiceId}, ${JSON.stringify(details)}::jsonb)
  `
}

router.get('/summary', async (_req, res) => {
  try {
    const row = firstRow<{
      collected_cents: string
      pending_cents: string
      overdue_cents: string
      this_month_cents: string
      total_billed_cents: string
    }>(await sql`
      SELECT
        COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (WHERE status = 'paid'), 0)::bigint AS collected_cents,
        COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (
          WHERE status NOT IN ('paid', 'cancelled', 'draft')
        ), 0)::bigint AS pending_cents,
        COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (
          WHERE status NOT IN ('paid', 'cancelled')
            AND due_at IS NOT NULL AND due_at < NOW()
        ), 0)::bigint AS overdue_cents,
        COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (
          WHERE status = 'paid'
            AND paid_at >= date_trunc('month', CURRENT_DATE)
        ), 0)::bigint AS this_month_cents,
        COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)), 0)::bigint AS total_billed_cents
      FROM invoices
    `)
    const collected = Number(row?.collected_cents ?? 0)
    const pending = Number(row?.pending_cents ?? 0)
    const overdue = Number(row?.overdue_cents ?? 0)
    const denom = collected + pending
    res.json({
      collected_cents: collected,
      pending_cents: pending,
      overdue_cents: overdue,
      this_month_cents: Number(row?.this_month_cents ?? 0),
      total_billed_cents: Number(row?.total_billed_cents ?? 0),
      collection_rate: denom > 0 ? Math.round((collected / denom) * 100) : collected > 0 ? 100 : 0,
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/', async (req, res) => {
  try {
    const status = req.query.status as string | undefined
    const q = status
      ? `${INVOICE_LIST} WHERE i.status = $1 ORDER BY i."createdAt" DESC`
      : `${INVOICE_LIST} ORDER BY i."createdAt" DESC`
    const result = await pool.query(q, status ? [status] : [])
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/', async (req, res) => {
  try {
    const auth = req.auth!
    const {
      client_id,
      project_id,
      invoice_number,
      status,
      tax_cents,
      discount_cents,
      due_at,
      amount_cents,
      invoice_type,
      line_description,
    } = req.body

    const dueDefault = due_at ?? new Date(Date.now() + 14 * 86400000).toISOString()
    const row = firstRow<{ id: string }>(await sql`
      INSERT INTO invoices (client_id, project_id, invoice_number, status, tax_cents, discount_cents, due_at, "updatedAt", "createdAt")
      VALUES (
        ${client_id ?? null}::uuid,
        ${project_id ?? null}::uuid,
        ${invoice_number ?? ''},
        ${status ?? 'draft'},
        ${tax_cents ?? 0},
        ${discount_cents ?? 0},
        ${dueDefault},
        NOW(),
        NOW()
      )
      RETURNING *
    `)

    const amount = Number(amount_cents ?? 0)
    if (amount > 0 && row?.id) {
      const desc =
        line_description ??
        ({
          milestone: 'Milestone payment',
          advance: 'Advance payment',
          final: 'Final payment',
          retainer: 'Monthly retainer',
          custom: 'Professional services',
        }[String(invoice_type)] as string | undefined) ??
        'Professional services'
      await sql`
        INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_cents, tax_percent, discount_cents, "createdAt")
        VALUES (${row.id}::uuid, ${desc}, 1, ${amount}, 0, 0, NOW())
      `
      await recalculateInvoiceTotals(row.id)
    }

    await logInvoiceActivity(auth.sub, 'invoice_created', row!.id, {
      invoice_number,
      client_id,
      project_id,
      invoice_type,
    })

    const full = firstRow(await sql`
      SELECT i.*, c.name AS client_name, p.name AS project_name
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      LEFT JOIN projects p ON p.id = i.project_id
      WHERE i.id = ${row!.id}::uuid
    `)
    res.status(201).json(full ?? row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/intelligence', async (req, res) => {
  try {
    const insight = await getInvoiceFinanceInsight(req.params.id)
    if (!insight) {
      res.status(404).json({ error: 'Invoice not found' })
      return
    }
    res.json(insight)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/activity', async (req, res) => {
  try {
    const timeline = await buildInvoiceTimeline(req.params.id)
    res.json(timeline)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const row = firstRow(await sql`
      SELECT i.*, c.name as client_name, c.email as client_email, c.company as client_company,
             p.name AS project_name, p.id::text AS project_id_text,
             CASE
               WHEN i.status NOT IN ('paid', 'cancelled')
                 AND i.due_at IS NOT NULL AND i.due_at < NOW()
               THEN 'overdue'
               WHEN i.status = 'sent' THEN 'pending'
               ELSE i.status
             END AS display_status
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      LEFT JOIN projects p ON p.id = i.project_id
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
    const auth = req.auth!
    const { id } = req.params
    const { status, tax_cents, discount_cents, due_at, paid_at, payment_link, project_id } = req.body
    const existing = firstRow<{ id: string; status: string }>(
      await sql`SELECT id, status FROM invoices WHERE id = ${id}::uuid`,
    )
    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' })
      return
    }
    await sql`
      UPDATE invoices SET
        status = COALESCE(${status ?? null}, status),
        tax_cents = COALESCE(${tax_cents !== undefined ? tax_cents : null}, tax_cents),
        discount_cents = COALESCE(${discount_cents !== undefined ? discount_cents : null}, discount_cents),
        due_at = COALESCE(${due_at !== undefined ? due_at : null}, due_at),
        paid_at = COALESCE(${paid_at !== undefined ? paid_at : null}, paid_at),
        payment_link = COALESCE(${payment_link !== undefined ? payment_link : null}, payment_link),
        project_id = COALESCE(${project_id !== undefined ? project_id : null}::uuid, project_id),
        "updatedAt" = NOW()
      WHERE id = ${id}::uuid
    `
    await recalculateInvoiceTotals(id)
    const row = firstRow(await sql`SELECT * FROM invoices WHERE id = ${id}::uuid`)
    if (status && status !== existing.status) {
      await logInvoiceActivity(auth.sub, 'invoice_status_changed', id, { from: existing.status, to: status })
    }
    if (status === 'paid') {
      void import('../services/workflowRunner.js').then(({ runCurvvtechWorkflows }) =>
        runCurvvtechWorkflows({ trigger_type: 'invoice_paid', entity_type: 'invoice', entity_id: id, payload: {} }),
      )
    }
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
    const { description, quantity, unit_price_cents, tax_percent, discount_cents } = req.body
    const row = firstRow(await sql`
      INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_cents, tax_percent, discount_cents, "createdAt")
      VALUES (${req.params.id}::uuid, ${description ?? ''}, ${quantity ?? 1}, ${unit_price_cents ?? 0}, ${tax_percent ?? 0}, ${discount_cents ?? 0}, NOW())
      RETURNING *
    `)
    await recalculateInvoiceTotals(req.params.id)
    res.status(201).json(row!)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/:id/items/:itemId', async (req, res) => {
  try {
    const { description, quantity, unit_price_cents, tax_percent, discount_cents } = req.body
    const { itemId } = req.params
    if (description !== undefined) await sql`UPDATE invoice_items SET description = ${description} WHERE id = ${itemId}::uuid`
    if (quantity !== undefined) await sql`UPDATE invoice_items SET quantity = ${quantity} WHERE id = ${itemId}::uuid`
    if (unit_price_cents !== undefined) await sql`UPDATE invoice_items SET unit_price_cents = ${unit_price_cents} WHERE id = ${itemId}::uuid`
    if (tax_percent !== undefined) await sql`UPDATE invoice_items SET tax_percent = ${tax_percent} WHERE id = ${itemId}::uuid`
    if (discount_cents !== undefined) await sql`UPDATE invoice_items SET discount_cents = ${discount_cents} WHERE id = ${itemId}::uuid`
    await recalculateInvoiceTotals(req.params.id)
    res.json(firstRow(await sql`SELECT * FROM invoice_items WHERE id = ${itemId}::uuid`))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    await sql`DELETE FROM invoice_items WHERE id = ${req.params.itemId}::uuid AND invoice_id = ${req.params.id}::uuid`
    await recalculateInvoiceTotals(req.params.id)
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/pdf', async (req, res) => {
  try {
    const inv = firstRow(await sql`
      SELECT i.*, c.name AS client_name, c.email AS client_email, c.company AS client_company
      FROM invoices i LEFT JOIN clients c ON c.id = i.client_id WHERE i.id = ${req.params.id}::uuid
    `) as Record<string, unknown> | null
    if (!inv) {
      res.status(404).send('Not found')
      return
    }
    const company = firstRow(await sql`SELECT * FROM company_settings LIMIT 1`) as Record<string, unknown> | null
    const items = await sql`SELECT * FROM invoice_items WHERE invoice_id = ${req.params.id}::uuid ORDER BY "createdAt" ASC`
    const brand = escapeHtml(company?.company_name ?? 'CurvvTech')
    const logo = company?.logo_url ? `<img src="${escapeHtml(company.logo_url)}" alt="logo" style="max-height:48px" />` : ''
    const rows = (items as Record<string, unknown>[])
      .map((item) => {
        const qty = Number(item.quantity ?? 1)
        const line = qty * Number(item.unit_price_cents ?? 0)
        return `<tr><td>${escapeHtml(item.description)}</td><td style="text-align:right">${qty}</td><td style="text-align:right">₹${(line / 100).toLocaleString()}</td></tr>`
      })
      .join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(inv.invoice_number)}</title>
      <style>body{font-family:system-ui,sans-serif;padding:40px;color:#111;max-width:800px;margin:0 auto}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
      table{width:100%;border-collapse:collapse;margin:24px 0}th,td{border-bottom:1px solid #eee;padding:10px;text-align:left}
      .total{text-align:right;font-size:18px;font-weight:700;margin-top:16px}
      .muted{color:#666;font-size:13px}</style></head><body>
      <div class="header"><div>${logo}<h1 style="margin:8px 0 0">${brand}</h1>
      <p class="muted">${escapeHtml(company?.address ?? '')}<br/>GST: ${escapeHtml(company?.gst_number ?? company?.tax_id ?? '—')}</p></div>
      <div style="text-align:right"><h2>INVOICE</h2><p>#${escapeHtml(inv.invoice_number)}</p><p class="muted">Status: ${escapeHtml(inv.status)}</p></div></div>
      <p><strong>Bill to:</strong> ${escapeHtml(inv.client_name ?? inv.client_company ?? '')}<br/>${escapeHtml(inv.client_email ?? '')}</p>
      <table><thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="total">Total: ₹${Number(inv.total_cents ?? inv.amount_cents ?? 0) / 100}</p>
      ${inv.payment_link ? `<p class="muted">Pay online: ${escapeHtml(inv.payment_link)}</p>` : ''}
      </body></html>`
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (e) {
    res.status(500).send((e as Error).message)
  }
})

router.post('/:id/payment-link', async (req, res) => {
  try {
    if (!razorpayConfigured()) {
      res.status(503).json({ error: 'Razorpay not configured' })
      return
    }
    const auth = req.auth!
    const inv = firstRow(await sql`SELECT * FROM invoices WHERE id = ${req.params.id}::uuid`) as Record<string, unknown> | null
    if (!inv) {
      res.status(404).json({ error: 'Invoice not found' })
      return
    }
    const amount = Number(inv.total_cents ?? inv.amount_cents ?? 0)
    if (amount < 100) {
      res.status(400).json({ error: 'Invoice total must be at least ₹1' })
      return
    }
    const order = await createRazorpayOrder({
      amount,
      receipt: String(inv.invoice_number ?? inv.id).slice(0, 40),
      notes: { invoice_id: String(inv.id) },
    })
    await sql`
      UPDATE invoices SET
        razorpay_order_id = ${order.order_id},
        payment_link = ${`order:${order.order_id}`},
        status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END,
        "updatedAt" = NOW()
      WHERE id = ${req.params.id}::uuid
    `
    await logInvoiceActivity(auth.sub, 'payment_link_sent', req.params.id, { order_id: order.order_id })
    res.json({ order_id: order.order_id, amount: order.amount, currency: order.currency, key_id: order.key_id })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await sql`DELETE FROM invoices WHERE id = ${req.params.id}::uuid`
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
