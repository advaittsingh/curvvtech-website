import { firstRow, sql } from '../../../lib/sqlPool.js'

export type PayrollAiInsight = {
  insight: string
  payroll_growth_pct: number | null
  highest_cost_name: string | null
  highest_cost_cents: number
  upcoming_payout_cents: number
  upcoming_days: number | null
  contractor_count: number
  recommended_action: string
  risk_note: string | null
}

export async function getPayrollInsight(): Promise<PayrollAiInsight> {
  const stats = firstRow<{
    monthly_payroll_cents: string
    employee_count: number
    contractor_count: number
    this_month_runs_cents: string
    last_month_runs_cents: string
    highest_name: string | null
    highest_cents: string
    next_pay_date: string | null
    next_pay_cents: string
    overdue_contractor_expenses: number
  }>(await sql`
    SELECT
      COALESCE(SUM(monthly_salary_cents) FILTER (WHERE is_active), 0)::bigint AS monthly_payroll_cents,
      COUNT(*) FILTER (WHERE is_active AND employment_type = 'employee')::int AS employee_count,
      COUNT(*) FILTER (WHERE is_active AND employment_type = 'contractor')::int AS contractor_count,
      COALESCE((
        SELECT SUM(total_cents) FROM payroll_runs
        WHERE status IN ('completed', 'paid', 'approved')
          AND period_end >= date_trunc('month', CURRENT_DATE)
      ), 0)::bigint AS this_month_runs_cents,
      COALESCE((
        SELECT SUM(total_cents) FROM payroll_runs
        WHERE status IN ('completed', 'paid', 'approved')
          AND period_end >= date_trunc('month', CURRENT_DATE) - interval '1 month'
          AND period_end < date_trunc('month', CURRENT_DATE)
      ), 0)::bigint AS last_month_runs_cents,
      (
        SELECT name FROM compensation_profiles
        WHERE is_active
        ORDER BY monthly_salary_cents DESC
        LIMIT 1
      ) AS highest_name,
      COALESCE((
        SELECT monthly_salary_cents FROM compensation_profiles
        WHERE is_active
        ORDER BY monthly_salary_cents DESC
        LIMIT 1
      ), 0)::bigint AS highest_cents,
      (
        SELECT MIN(COALESCE(next_pay_date, (date_trunc('month', CURRENT_DATE) + (pay_day - 1) * interval '1 day')::date))
        FROM compensation_profiles
        WHERE is_active AND (next_pay_date IS NOT NULL OR pay_day IS NOT NULL)
      )::text AS next_pay_date,
      COALESCE(SUM(monthly_salary_cents) FILTER (WHERE is_active), 0)::bigint AS next_pay_cents,
      (
        SELECT COUNT(*)::int FROM expenses e
        JOIN compensation_profiles cp ON cp.name ILIKE '%' || COALESCE(e.vendor, '') || '%'
        WHERE cp.employment_type = 'contractor' AND cp.is_active
          AND e.category = 'payroll'
          AND e.expense_date < CURRENT_DATE - interval '30 days'
      ) AS overdue_contractor_expenses
    FROM compensation_profiles
  `)

  const monthlyPayroll = Number(stats?.monthly_payroll_cents ?? 0)
  const thisMonth = Number(stats?.this_month_runs_cents ?? 0) || monthlyPayroll
  const lastMonth = Number(stats?.last_month_runs_cents ?? 0)
  const contractorCount = Number(stats?.contractor_count ?? 0)

  let growthPct: number | null = null
  if (lastMonth > 0) {
    growthPct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
  }

  let upcomingDays: number | null = null
  if (stats?.next_pay_date) {
    const d = new Date(stats.next_pay_date)
    upcomingDays = Math.max(0, Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  }

  if (monthlyPayroll === 0 && Number(stats?.employee_count ?? 0) === 0) {
    return {
      insight: 'No compensation profiles yet — add employees and contractors to track payroll.',
      payroll_growth_pct: null,
      highest_cost_name: null,
      highest_cost_cents: 0,
      upcoming_payout_cents: 0,
      upcoming_days: null,
      contractor_count: 0,
      recommended_action: 'Create compensation profiles from your Team module or add contractors manually.',
      risk_note: null,
    }
  }

  const growthLine =
    growthPct !== null
      ? growthPct >= 0
        ? `Monthly payroll increased ${growthPct}%.`
        : `Monthly payroll decreased ${Math.abs(growthPct)}%.`
      : 'Payroll tracking started — trends will appear after your first runs.'

  const highestLine = stats?.highest_name
    ? `Highest cost: ${stats.highest_name}.`
    : ''

  return {
    insight: [growthLine, highestLine].filter(Boolean).join(' '),
    payroll_growth_pct: growthPct,
    highest_cost_name: stats?.highest_name ?? null,
    highest_cost_cents: Number(stats?.highest_cents ?? 0),
    upcoming_payout_cents: Number(stats?.next_pay_cents ?? monthlyPayroll),
    upcoming_days: upcomingDays,
    contractor_count: contractorCount,
    recommended_action:
      contractorCount >= 2
        ? 'Convert recurring contractors to retainers to stabilize cash flow.'
        : 'Schedule payroll runs before month-end to avoid payout delays.',
    risk_note:
      Number(stats?.overdue_contractor_expenses ?? 0) > 0
        ? `${stats!.overdue_contractor_expenses} contractor payment(s) may be overdue.`
        : null,
  }
}
