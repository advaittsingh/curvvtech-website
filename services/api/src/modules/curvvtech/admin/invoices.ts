import { Router } from 'express'
import { pool } from '../../../db.js'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'
import { recalculateInvoiceTotals } from '../services/invoiceRecalculate.js'
import { buildInvoiceDocumentHtml } from '../services/invoiceDocumentHtml.js'
import { buildInvoiceTimeline, getInvoiceFinanceInsight } from '../services/invoiceIntelligence.js'
import { createRazorpayOrder, razorpayErrorStatus } from '../../billing/razorpayCheckout.js'
import { razorpayConfigured } from '../../billing/razorpayClient.js'
import { emitClientActivity } from '../../shared/activity/emitActivityEvent.js'
import { sendClientEmail } from '../../shared/communications/emailService.js'
import { config } from '../../../config.js'
import { asyncHandler } from '../../../lib/asyncHandler.js'
import { sendPaymentReminder } from '../services/paymentReminder.js'

const router = Router()
router.use(requireCurvvtechAdmin)

const CLIENT_VISIBLE_INVOICE_STATUSES = ['sent', 'viewed', 'paid', 'overdue', 'partial']

function invoiceActor(req: { auth?: { sub?: string; email?: string } }): { actorId: string; actorName: string } {
  return { actorId: req.auth?.sub ?? 'system', actorName: req.auth?.email ?? 'Your team' }
}

async function emitInvoiceGenerated(
  req: { auth?: { sub?: string; email?: string } },
  invoiceId: string,
): Promise<void> {
  const inv = firstRow<{ client_id: string | null; project_id: string | null; invoice_number: string | null; total_cents: number | null; amount_cents: number | null }>(
    await sql`SELECT client_id, project_id, invoice_number, total_cents, amount_cents FROM invoices WHERE id = ${invoiceId}::uuid`,
  )
  if (!inv?.client_id) return
  await emitClientActivity(inv.client_id, {
    ...invoiceActor(req),
    projectId: inv.project_id,
    eventType: 'invoice.generated',
    entityType: 'invoice',
    entityId: invoiceId,
    title: `Invoice ${inv.invoice_number ?? ''}`.trim() + ' is ready',
    metadata: { total_cents: inv.total_cents ?? inv.amount_cents ?? 0 },
  })
}

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
    // Derive the invoice's organization from its client so it is visible in the
    // client portal (portal queries are scoped by organization_id). Falls back to
    // the project's org, then the Curvvtech default org.
    const row = firstRow<{ id: string }>(await sql`
      INSERT INTO invoices (client_id, project_id, invoice_number, status, tax_cents, discount_cents, due_at, organization_id, "updatedAt", "createdAt")
      VALUES (
        ${client_id ?? null}::uuid,
        ${project_id ?? null}::uuid,
        ${invoice_number ?? ''},
        ${status ?? 'draft'},
        ${tax_cents ?? 0},
        ${discount_cents ?? 0},
        ${dueDefault},
        COALESCE(
          (SELECT organization_id FROM clients WHERE id = ${client_id ?? null}::uuid),
          (SELECT organization_id FROM projects WHERE id = ${project_id ?? null}::uuid),
          (SELECT id FROM organizations WHERE slug = 'curvvtech' LIMIT 1)
        ),
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

    if (CLIENT_VISIBLE_INVOICE_STATUSES.includes(String(status ?? 'draft'))) {
      await emitInvoiceGenerated(req, row!.id)
    }

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

/** Send / publish an invoice to the client portal (and email the client). */
router.post('/:id/send', async (req, res) => {
  try {
    const auth = req.auth!
    const inv = firstRow<{
      id: string
      status: string
      client_id: string | null
      invoice_number: string | null
      total_cents: number | null
      amount_cents: number | null
    }>(await sql`
      SELECT id, status, client_id, invoice_number, total_cents, amount_cents
      FROM invoices WHERE id = ${req.params.id}::uuid
    `)
    if (!inv) {
      res.status(404).json({ error: 'Invoice not found' })
      return
    }
    if (!inv.client_id) {
      res.status(400).json({ error: 'Attach a client to this invoice before sending it to the portal.' })
      return
    }

    const newStatus = inv.status === 'draft' ? 'sent' : inv.status
    // Publish to the portal AND backfill organization_id so it passes the portal's
    // org-scoped visibility filter (older invoices may have a NULL org).
    await sql`
      UPDATE invoices SET
        status = ${newStatus},
        organization_id = COALESCE(
          organization_id,
          (SELECT organization_id FROM clients WHERE id = ${inv.client_id}::uuid),
          (SELECT organization_id FROM projects WHERE id = invoices.project_id)
        ),
        "updatedAt" = NOW()
      WHERE id = ${inv.id}::uuid
    `

    await logInvoiceActivity(auth.sub, 'invoice_sent_to_portal', inv.id, { status: newStatus })
    await emitInvoiceGenerated(req, inv.id)

    // Notify the client by email with a link to their billing page.
    const client = firstRow<{ organization_id: string | null; email: string | null; name: string | null }>(
      await sql`SELECT organization_id, email, name FROM clients WHERE id = ${inv.client_id}::uuid`,
    )
    let emailSent = false
    if (client?.organization_id && client.email) {
      const link = `${config.clientPortalUrl}/billing?tab=invoices`
      emailSent = await sendClientEmail({
        organizationId: client.organization_id,
        to: client.email,
        subject: `Invoice ${inv.invoice_number ?? ''} from your project portal`.trim(),
        html: `<p>Hi ${client.name ?? 'there'},</p>
               <p>A new invoice (<strong>${inv.invoice_number ?? ''}</strong>) is available in your project portal.</p>
               <p>You can view it, download the PDF, and pay securely here:</p>
               <p><a href="${link}">${link}</a></p>
               <p>Thank you.</p>`,
      }).catch(() => false)
    }

    res.json({ ok: true, status: newStatus, email_sent: emailSent })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

/** Send a payment reminder email + client portal notification for this invoice. */
router.post(
  '/:id/payment-reminder',
  asyncHandler(async (req, res) => {
    const auth = req.auth!
    const { message } = req.body as { message?: string }
    const invoiceId = String(req.params.id)
    const inv = firstRow<{ client_id: string | null }>(
      await sql`SELECT client_id::text FROM invoices WHERE id = ${invoiceId}::uuid LIMIT 1`,
    )
    if (!inv?.client_id) {
      res.status(404).json({ error: 'Invoice not found' })
      return
    }
    const result = await sendPaymentReminder({
      clientId: inv.client_id,
      invoiceId,
      actorId: auth.sub,
      actorName: auth.email ?? 'Staff',
      message,
    })
    res.status(201).json(result)
  }),
)

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
      // First time the invoice becomes client-visible → publish to the client journal.
      if (
        CLIENT_VISIBLE_INVOICE_STATUSES.includes(status) &&
        !CLIENT_VISIBLE_INVOICE_STATUSES.includes(existing.status)
      ) {
        await emitInvoiceGenerated(req, id)
      }
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
      SELECT
        i.*,
        c.name AS client_name,
        c.email AS client_email,
        c.company AS client_company,
        c.phone AS client_phone,
        c.address AS client_address,
        c.gst_number AS client_gst,
        c.pan_number AS client_pan,
        p.name AS project_name
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      LEFT JOIN projects p ON p.id = i.project_id
      WHERE i.id = ${req.params.id}::uuid
    `) as Record<string, unknown> | null
    if (!inv) {
      res.status(404).send('Not found')
      return
    }
    const company = firstRow(await sql`SELECT * FROM company_settings ORDER BY "createdAt" ASC LIMIT 1`) as Record<string, unknown> | null
    const items = await sql`
      SELECT description, quantity, unit_price_cents, tax_percent, discount_cents
      FROM invoice_items
      WHERE invoice_id = ${req.params.id}::uuid
      ORDER BY "createdAt" ASC
    `
    const html = buildInvoiceDocumentHtml(
      {
        invoice_number: String(inv.invoice_number ?? ''),
        status: inv.status as string | null,
        created_at: inv.createdAt as string | null,
        due_at: inv.due_at as string | null,
        paid_at: inv.paid_at as string | null,
        subtotal_cents: inv.subtotal_cents as number | null,
        tax_cents: inv.tax_cents as number | null,
        discount_cents: inv.discount_cents as number | null,
        total_cents: inv.total_cents as number | null,
        amount_cents: inv.amount_cents as number | null,
        payment_link: inv.payment_link as string | null,
        client_name: inv.client_name as string | null,
        client_company: inv.client_company as string | null,
        client_email: inv.client_email as string | null,
        client_phone: inv.client_phone as string | null,
        client_address: inv.client_address as string | null,
        client_gst: inv.client_gst as string | null,
        client_pan: inv.client_pan as string | null,
        project_name: inv.project_name as string | null,
        items: (items as Record<string, unknown>[]).map((item) => ({
          description: String(item.description ?? ''),
          quantity: Number(item.quantity ?? 1),
          unit_price_cents: Number(item.unit_price_cents ?? 0),
          tax_percent: Number(item.tax_percent ?? 0),
          discount_cents: Number(item.discount_cents ?? 0),
        })),
      },
      {
        company_name: company?.company_name as string | null,
        address: company?.address as string | null,
        phone: company?.phone as string | null,
        gst_number: company?.gst_number as string | null,
        tax_id: company?.tax_id as string | null,
        pan_number: company?.pan_number as string | null,
        logo_url: company?.logo_url as string | null,
        bank_account_name: company?.bank_account_name as string | null,
        bank_account_number: company?.bank_account_number as string | null,
        bank_ifsc: company?.bank_ifsc as string | null,
        bank_name: company?.bank_name as string | null,
        bank_account_type: company?.bank_account_type as string | null,
        upi_id: company?.upi_id as string | null,
        upi_qr_url: company?.upi_qr_url as string | null,
        signature_url: company?.signature_url as string | null,
        default_gst_percent: company?.default_gst_percent as number | null,
      },
    )
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
    if (String(inv.status ?? 'draft') === 'draft') {
      await emitInvoiceGenerated(req, req.params.id)
    }
    res.json({ order_id: order.order_id, amount: order.amount, currency: order.currency, key_id: order.key_id })
  } catch (e) {
    const err = e as Error & { code?: string; status?: number };
    if (err.code === "NOT_CONFIGURED") {
      res.status(503).json({ error: "Razorpay not configured" });
      return;
    }
    const { status, message } = razorpayErrorStatus(e);
    res.status(status === 401 ? 503 : status).json({
      error: status === 401 ? "Razorpay authentication failed — check API keys in server config" : message,
    });
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
