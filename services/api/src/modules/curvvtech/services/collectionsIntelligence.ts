import { firstRow, sql } from '../../../lib/sqlPool.js'

export type CollectionsAiInsight = {
  insight: string
  recommended_action: string
  expected_recovery_cents: number
  overdue_count: number
  collection_probability: number
  target_invoice_id?: string | null
  target_invoice_number?: string | null
  target_client_name?: string | null
}

export async function getCollectionsInsight(): Promise<CollectionsAiInsight> {
  const stats = firstRow<{
    overdue_count: number
    overdue_cents: string
    pending_count: number
    due_this_week_cents: string
  }>(await sql`
    SELECT
      COUNT(*) FILTER (
        WHERE status NOT IN ('paid', 'cancelled')
          AND due_at IS NOT NULL AND due_at < NOW()
      )::int AS overdue_count,
      COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (
        WHERE status NOT IN ('paid', 'cancelled')
          AND due_at IS NOT NULL AND due_at < NOW()
      ), 0)::bigint AS overdue_cents,
      COUNT(*) FILTER (WHERE status NOT IN ('paid', 'cancelled', 'draft'))::int AS pending_count,
      COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (
        WHERE status NOT IN ('paid', 'cancelled')
          AND due_at >= date_trunc('week', CURRENT_DATE)
          AND due_at < date_trunc('week', CURRENT_DATE) + interval '7 days'
      ), 0)::bigint AS due_this_week_cents
  `)

  const overdueCount = Number(stats?.overdue_count ?? 0)
  const overdueCents = Number(stats?.overdue_cents ?? 0)
  const dueWeekCents = Number(stats?.due_this_week_cents ?? 0)

  if (overdueCount === 0 && dueWeekCents === 0) {
    return {
      insight: 'Collections look healthy — no overdue invoices right now.',
      recommended_action: 'Send payment links for any draft invoices to accelerate cash flow.',
      expected_recovery_cents: 0,
      overdue_count: 0,
      collection_probability: 95,
    }
  }

  if (overdueCount > 0) {
    const target = firstRow<{
      id: string
      invoice_number: string
      client_name: string | null
    }>(await sql`
      SELECT i.id::text, i.invoice_number, c.name AS client_name
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      WHERE i.status NOT IN ('paid', 'cancelled')
        AND i.due_at IS NOT NULL AND i.due_at < NOW()
      ORDER BY i.due_at ASC
      LIMIT 1
    `)
    return {
      insight: `${overdueCount} invoice${overdueCount === 1 ? '' : 's'} overdue.`,
      recommended_action: 'Send reminder tomorrow for the oldest overdue invoice.',
      expected_recovery_cents: overdueCents,
      overdue_count: overdueCount,
      collection_probability: overdueCount === 1 ? 91 : Math.max(55, 85 - overdueCount * 8),
      target_invoice_id: target?.id ?? null,
      target_invoice_number: target?.invoice_number ?? null,
      target_client_name: target?.client_name ?? null,
    }
  }

  return {
    insight: `${Number(stats?.pending_count ?? 0)} invoice(s) awaiting payment.`,
    recommended_action: 'Follow up on invoices due this week before they slip overdue.',
    expected_recovery_cents: dueWeekCents,
    overdue_count: 0,
    collection_probability: 88,
  }
}
