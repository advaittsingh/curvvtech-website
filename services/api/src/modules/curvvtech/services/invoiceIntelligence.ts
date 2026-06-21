import { firstRow, sql } from '../../../lib/sqlPool.js'

export type InvoiceFinanceInsight = {
  insight: string
  recommended_action: string
  collection_probability: number
  expected_collection_date: string | null
  risk_level: 'low' | 'medium' | 'high'
  client_payment_note?: string
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000)
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export async function getInvoiceFinanceInsight(invoiceId: string): Promise<InvoiceFinanceInsight | null> {
  const inv = firstRow<{
    status: string
    due_at: string | null
    paid_at: string | null
    client_id: string | null
    payment_link: string | null
    total_cents: number
    createdAt: string
  }>(await sql`
    SELECT status, due_at::text, paid_at::text, client_id::text, payment_link,
           COALESCE(total_cents, amount_cents, 0) AS total_cents, "createdAt"::text
    FROM invoices WHERE id = ${invoiceId}::uuid
  `)
  if (!inv) return null

  let avgDaysToPay = 5
  if (inv.client_id) {
    const hist = firstRow<{ avg_days: number | null }>(await sql`
      SELECT AVG(EXTRACT(EPOCH FROM (paid_at - "createdAt")) / 86400)::float AS avg_days
      FROM invoices
      WHERE client_id = ${inv.client_id}::uuid AND status = 'paid' AND paid_at IS NOT NULL
    `)
    if (hist?.avg_days != null && Number.isFinite(Number(hist.avg_days))) {
      avgDaysToPay = Math.max(1, Math.round(Number(hist.avg_days)))
    }
  }

  const now = new Date()
  const due = inv.due_at ? new Date(inv.due_at) : addDays(now, 14)
  const isOverdue = inv.status !== 'paid' && due.getTime() < now.getTime()
  const expected = inv.status === 'paid' ? null : formatDate(addDays(now, avgDaysToPay))

  let insight = 'Invoice is on track.'
  let recommended = 'Monitor until due date.'
  let probability = 88
  let risk: InvoiceFinanceInsight['risk_level'] = 'low'

  if (inv.status === 'draft') {
    insight = 'Invoice has not been sent yet.'
    recommended = 'Send payment link immediately.'
    probability = 72
    risk = 'medium'
  } else if (inv.status === 'paid') {
    insight = 'Payment collected successfully.'
    recommended = 'Archive and sync with project financials.'
    probability = 100
    risk = 'low'
  } else if (isOverdue) {
    insight = 'Invoice is overdue — collection risk elevated.'
    recommended = 'Send a payment reminder today.'
    probability = 45
    risk = 'high'
  } else if (inv.status === 'sent' || inv.payment_link) {
    insight = 'Invoice sent — awaiting client payment.'
    recommended = avgDaysToPay <= 5 ? 'Low urgency — client typically pays quickly.' : `Follow up if unpaid by ${expected ?? 'due date'}.`
    probability = avgDaysToPay <= 5 ? 92 : 78
    risk = avgDaysToPay <= 5 ? 'low' : 'medium'
  }

  const clientNote =
    avgDaysToPay <= 5
      ? `Client historically pays within ${avgDaysToPay} day${avgDaysToPay === 1 ? '' : 's'}.`
      : `Client average payment time is ${avgDaysToPay} days.`

  return {
    insight,
    recommended_action: recommended,
    collection_probability: probability,
    expected_collection_date: expected,
    risk_level: risk,
    client_payment_note: clientNote,
  }
}

export type InvoiceTimelineEvent = {
  key: string
  title: string
  description?: string
  at?: string | null
  state: 'done' | 'pending' | 'upcoming'
}

export async function buildInvoiceTimeline(invoiceId: string): Promise<InvoiceTimelineEvent[]> {
  const inv = firstRow<{
    status: string
    createdAt: string
    updatedAt: string
    paid_at: string | null
    payment_link: string | null
    razorpay_order_id: string | null
  }>(await sql`
    SELECT status, "createdAt"::text, "updatedAt"::text, paid_at::text,
           payment_link, razorpay_order_id
    FROM invoices WHERE id = ${invoiceId}::uuid
  `)
  if (!inv) return []

  const sent = Boolean(inv.payment_link || inv.razorpay_order_id || inv.status === 'sent' || inv.status === 'paid')
  const paid = inv.status === 'paid'

  return [
    {
      key: 'created',
      title: 'Invoice created',
      at: inv.createdAt,
      state: 'done',
    },
    {
      key: 'sent',
      title: 'Payment link sent',
      at: sent ? inv.updatedAt : null,
      state: sent ? 'done' : 'pending',
    },
    {
      key: 'viewed',
      title: 'Viewed by client',
      state: 'pending',
      description: 'Portal view tracking coming soon',
    },
    {
      key: 'paid',
      title: 'Paid',
      at: inv.paid_at,
      state: paid ? 'done' : 'pending',
    },
  ]
}
