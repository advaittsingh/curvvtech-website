import { firstRow, sql } from '../../../lib/sqlPool.js'

export type ExpenseAiInsight = {
  insight: string
  largest_category: string | null
  largest_category_cents: number
  month_over_month_pct: number | null
  potential_savings_cents: number
  recommended_action: string
}

export async function getExpenseInsight(): Promise<ExpenseAiInsight> {
  const stats = firstRow<{
    this_month_cents: string
    last_month_cents: string
    largest_category: string | null
    largest_category_cents: string
    software_cents: string
    total_expenses_cents: string
  }>(await sql`
    SELECT
      COALESCE(SUM(amount_cents) FILTER (
        WHERE expense_date >= date_trunc('month', CURRENT_DATE)
      ), 0)::bigint AS this_month_cents,
      COALESCE(SUM(amount_cents) FILTER (
        WHERE expense_date >= date_trunc('month', CURRENT_DATE) - interval '1 month'
          AND expense_date < date_trunc('month', CURRENT_DATE)
      ), 0)::bigint AS last_month_cents,
      (
        SELECT category FROM expenses
        WHERE expense_date >= date_trunc('month', CURRENT_DATE) - interval '3 months'
        GROUP BY category
        ORDER BY SUM(amount_cents) DESC
        LIMIT 1
      ) AS largest_category,
      COALESCE((
        SELECT SUM(amount_cents) FROM expenses
        WHERE expense_date >= date_trunc('month', CURRENT_DATE) - interval '3 months'
        GROUP BY category
        ORDER BY SUM(amount_cents) DESC
        LIMIT 1
      ), 0)::bigint AS largest_category_cents,
      COALESCE(SUM(amount_cents) FILTER (
        WHERE category IN ('software', 'general') AND expense_date >= date_trunc('month', CURRENT_DATE) - interval '3 months'
      ), 0)::bigint AS software_cents,
      COALESCE(SUM(amount_cents), 0)::bigint AS total_expenses_cents
    FROM expenses
  `)

  const thisMonth = Number(stats?.this_month_cents ?? 0)
  const lastMonth = Number(stats?.last_month_cents ?? 0)
  const largestCat = stats?.largest_category ?? null
  const largestCents = Number(stats?.largest_category_cents ?? 0)
  const softwareCents = Number(stats?.software_cents ?? 0)

  let monthOverMonth: number | null = null
  if (lastMonth > 0) {
    monthOverMonth = Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
  }

  const potentialSavings = Math.round(Math.min(softwareCents * 0.15, largestCents * 0.1, 500000))

  if (thisMonth === 0 && Number(stats?.total_expenses_cents ?? 0) === 0) {
    return {
      insight: 'No expenses recorded yet — start tracking spend to unlock profitability insights.',
      largest_category: null,
      largest_category_cents: 0,
      month_over_month_pct: null,
      potential_savings_cents: 0,
      recommended_action: 'Add software subscriptions, contractor payments, and marketing spend.',
    }
  }

  const momLine =
    monthOverMonth !== null
      ? monthOverMonth >= 0
        ? `Spending increased ${monthOverMonth}% compared to last month.`
        : `Spending decreased ${Math.abs(monthOverMonth)}% compared to last month.`
      : 'First month of tracked spending.'

  const largestLine = largestCat
    ? `Largest spend category: ${formatCategory(largestCat)} (${formatInr(largestCents)}).`
    : ''

  return {
    insight: [momLine, largestLine].filter(Boolean).join(' '),
    largest_category: largestCat,
    largest_category_cents: largestCents,
    month_over_month_pct: monthOverMonth,
    potential_savings_cents: potentialSavings,
    recommended_action:
      softwareCents > 100000
        ? 'Review unused SaaS subscriptions and consolidate duplicate tools.'
        : largestCat === 'marketing'
          ? 'Audit marketing ROI — pause underperforming campaigns.'
          : 'Set monthly category budgets to protect profit margins.',
  }
}

function formatCategory(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ')
}

function formatInr(cents: number): string {
  const rupees = cents / 100
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(0)}K`
  return `₹${rupees.toLocaleString('en-IN')}`
}
