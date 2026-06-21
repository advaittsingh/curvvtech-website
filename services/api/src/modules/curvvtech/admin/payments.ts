import { Router } from 'express'
import { pool } from '../../../db.js'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'
import { getCollectionsInsight } from '../services/collectionsIntelligence.js'

const router = Router()
router.use(requireCurvvtechAdmin)

function paymentSource(row: { razorpay_order_id?: string | null; payment_link?: string | null }): string {
  if (row.razorpay_order_id || String(row.payment_link ?? '').startsWith('order:')) return 'Razorpay'
  if (String(row.payment_link ?? '').toLowerCase().includes('upi')) return 'UPI'
  return 'Bank Transfer'
}

router.get('/dashboard', async (_req, res) => {
  try {
    const summary = firstRow<{
      collected_cents: string
      pending_cents: string
      overdue_cents: string
      expected_this_month_cents: string
      collection_rate: number
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
          WHERE status NOT IN ('paid', 'cancelled')
            AND due_at >= date_trunc('month', CURRENT_DATE)
            AND due_at < date_trunc('month', CURRENT_DATE) + interval '1 month'
        ), 0)::bigint AS expected_this_month_cents,
        CASE
          WHEN (
            COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (WHERE status = 'paid'), 0)
            + COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (
              WHERE status NOT IN ('paid', 'cancelled', 'draft')
            ), 0)
          ) > 0
          THEN ROUND(
            100.0 * COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (WHERE status = 'paid'), 0)
            / NULLIF(
              COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (WHERE status = 'paid'), 0)
              + COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (
                WHERE status NOT IN ('paid', 'cancelled', 'draft')
              ), 0),
              0
            )
          )::int
          ELSE 0
        END AS collection_rate
      FROM invoices
    `)

    const cashflow = firstRow<{
      collected_this_week_cents: string
      collected_this_month_cents: string
      avg_invoice_cents: string
    }>(await sql`
      SELECT
        COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (
          WHERE status = 'paid' AND paid_at >= date_trunc('week', CURRENT_DATE)
        ), 0)::bigint AS collected_this_week_cents,
        COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (
          WHERE status = 'paid' AND paid_at >= date_trunc('month', CURRENT_DATE)
        ), 0)::bigint AS collected_this_month_cents,
        COALESCE(AVG(COALESCE(total_cents, amount_cents, 0)) FILTER (WHERE status = 'paid'), 0)::bigint AS avg_invoice_cents
      FROM invoices
    `)

    const pipeline = firstRow<{
      overdue_cents: string
      due_this_week_cents: string
      due_this_month_cents: string
      future_cents: string
    }>(await sql`
      SELECT
        COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (
          WHERE status NOT IN ('paid', 'cancelled')
            AND due_at IS NOT NULL AND due_at < NOW()
        ), 0)::bigint AS overdue_cents,
        COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (
          WHERE status NOT IN ('paid', 'cancelled')
            AND due_at >= date_trunc('week', CURRENT_DATE)
            AND due_at < date_trunc('week', CURRENT_DATE) + interval '7 days'
        ), 0)::bigint AS due_this_week_cents,
        COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (
          WHERE status NOT IN ('paid', 'cancelled')
            AND due_at >= date_trunc('month', CURRENT_DATE)
            AND due_at < date_trunc('month', CURRENT_DATE) + interval '1 month'
        ), 0)::bigint AS due_this_month_cents,
        COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (
          WHERE status NOT IN ('paid', 'cancelled')
            AND due_at >= date_trunc('month', CURRENT_DATE) + interval '1 month'
        ), 0)::bigint AS future_cents
      FROM invoices
    `)

    const trendRows = (await sql`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', NOW()) - interval '5 months',
          date_trunc('month', NOW()),
          interval '1 month'
        )::date AS month_start
      )
      SELECT
        to_char(m.month_start, 'Mon') AS month_label,
        m.month_start::text,
        COALESCE((
          SELECT SUM(COALESCE(i.total_cents, i.amount_cents, 0))::bigint
          FROM invoices i
          WHERE i.status = 'paid'
            AND i.paid_at >= m.month_start
            AND i.paid_at < m.month_start + interval '1 month'
        ), 0) AS collected_cents
      FROM months m
      ORDER BY m.month_start ASC
    `) as { month_label: string; month_start: string; collected_cents: string | number }[]

    const recentResult = await pool.query(
      `SELECT
        i.id::text,
        i.invoice_number,
        i.total_cents,
        i.amount_cents,
        i.paid_at::text,
        i.razorpay_order_id,
        i.payment_link,
        c.name AS client_name,
        p.name AS project_name
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      LEFT JOIN projects p ON p.id = i.project_id
      WHERE i.status = 'paid'
      ORDER BY i.paid_at DESC NULLS LAST, i."updatedAt" DESC
      LIMIT 20`,
    )

    const upcomingResult = await pool.query(
      `SELECT
        i.id::text,
        i.invoice_number,
        COALESCE(i.total_cents, i.amount_cents, 0) AS total_cents,
        i.due_at::text,
        c.name AS client_name,
        p.name AS project_name
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      LEFT JOIN projects p ON p.id = i.project_id
      WHERE i.status NOT IN ('paid', 'cancelled')
        AND i.due_at IS NOT NULL
      ORDER BY i.due_at ASC
      LIMIT 12`,
    )

    const paidRows = recentResult.rows as {
      razorpay_order_id?: string | null
      payment_link?: string | null
      total_cents?: number
      amount_cents?: number
    }[]
    const sourceMap = new Map<string, { count: number; cents: number }>()
    for (const row of paidRows) {
      const src = paymentSource(row)
      const cents = Number(row.total_cents ?? row.amount_cents ?? 0)
      const cur = sourceMap.get(src) ?? { count: 0, cents: 0 }
      sourceMap.set(src, { count: cur.count + 1, cents: cur.cents + cents })
    }
    const totalSourceCents = [...sourceMap.values()].reduce((s, v) => s + v.cents, 0) || 1
    const sources = [...sourceMap.entries()]
      .map(([source, v]) => ({
        source,
        count: v.count,
        amount_cents: v.cents,
        pct: Math.round((v.cents / totalSourceCents) * 100),
      }))
      .sort((a, b) => b.amount_cents - a.amount_cents)

    const ai = await getCollectionsInsight()

    res.json({
      summary: {
        collected_cents: Number(summary?.collected_cents ?? 0),
        pending_cents: Number(summary?.pending_cents ?? 0),
        overdue_cents: Number(summary?.overdue_cents ?? 0),
        expected_this_month_cents: Number(summary?.expected_this_month_cents ?? 0),
        collection_rate: Number(summary?.collection_rate ?? 0),
      },
      cashflow: {
        collected_this_week_cents: Number(cashflow?.collected_this_week_cents ?? 0),
        collected_this_month_cents: Number(cashflow?.collected_this_month_cents ?? 0),
        avg_invoice_cents: Number(cashflow?.avg_invoice_cents ?? 0),
        collection_rate: Number(summary?.collection_rate ?? 0),
      },
      pipeline: {
        overdue_cents: Number(pipeline?.overdue_cents ?? 0),
        due_this_week_cents: Number(pipeline?.due_this_week_cents ?? 0),
        due_this_month_cents: Number(pipeline?.due_this_month_cents ?? 0),
        future_cents: Number(pipeline?.future_cents ?? 0),
      },
      revenue_trend: trendRows.map((r) => ({
        month_label: r.month_label,
        month_start: r.month_start,
        collected_cents: Number(r.collected_cents ?? 0),
      })),
      recent_payments: recentResult.rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        invoice_number: r.invoice_number,
        client_name: r.client_name,
        project_name: r.project_name,
        total_cents: Number(r.total_cents ?? r.amount_cents ?? 0),
        paid_at: r.paid_at,
        source: paymentSource(r as { razorpay_order_id?: string; payment_link?: string }),
      })),
      upcoming: upcomingResult.rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        invoice_number: r.invoice_number,
        client_name: r.client_name,
        project_name: r.project_name,
        total_cents: Number(r.total_cents ?? 0),
        due_at: r.due_at,
      })),
      sources,
      ai_insight: ai,
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
