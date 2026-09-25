import { sql, firstRow } from '../../../lib/sqlPool.js'
import { buildDashboardOverview } from './dashboardOverview.js'

function num(v: unknown): number {
  return Number(v ?? 0)
}

function rowVal(row: unknown, key: string): unknown {
  return row && typeof row === 'object' ? (row as Record<string, unknown>)[key] : undefined
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return null
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

export async function buildCeoCommandCenter() {
  const overview = await buildDashboardOverview()
  const revenue = overview.revenue
  const pipeline = overview.pipeline
  const snapshot = overview.today_snapshot
  const projects = overview.projects_summary
  const widgets = overview.widgets
  const ai = overview.ai_assistant

  const company = firstRow(await sql`SELECT cash_in_bank_cents FROM company_settings LIMIT 1`)

  const payablesRow = firstRow(await sql`
    SELECT COALESCE(SUM(amount_cents), 0)::bigint AS payables_cents
    FROM expenses
    WHERE expense_date >= date_trunc('month', NOW())
  `)

  const gstRow = firstRow(await sql`
    SELECT COALESCE(SUM(COALESCE(gst_cents, 0)), 0)::bigint AS gst_cents
    FROM projects
    WHERE status NOT IN ('completed', 'cancelled', 'archived')
  `)

  const yesterdayRow = firstRow(await sql`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= date_trunc('day', NOW() - interval '1 day') AND paid_at < date_trunc('day', NOW()) THEN amount_cents ELSE 0 END), 0)::bigint AS collected_cents,
      (SELECT COUNT(*)::int FROM milestones WHERE completed_at >= date_trunc('day', NOW() - interval '1 day') AND completed_at < date_trunc('day', NOW())) AS milestones_completed,
      (SELECT COUNT(*)::int FROM crm_leads WHERE "createdAt" >= date_trunc('day', NOW() - interval '1 day') AND "createdAt" < date_trunc('day', NOW())) AS leads_created
  `)

  const weekRevenueRow = firstRow(await sql`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= date_trunc('week', NOW()) THEN amount_cents ELSE 0 END), 0)::bigint AS this_week_cents,
      COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= date_trunc('week', NOW() - interval '1 week') AND paid_at < date_trunc('week', NOW()) THEN amount_cents ELSE 0 END), 0)::bigint AS last_week_cents
  `)

  const proposalsAwaiting = num(
    rowVal(firstRow(await sql`SELECT COUNT(*)::int AS c FROM proposals WHERE status IN ('sent', 'viewed')`), 'c'),
  )

  const overdueTasks = num(
    rowVal(
      firstRow(await sql`
        SELECT
          (SELECT COUNT(*)::int FROM tasks WHERE due_at < NOW() AND status NOT IN ('done', 'cancelled', 'completed'))
          + (SELECT COUNT(*)::int FROM milestones WHERE due_at < NOW() AND completed_at IS NULL) AS c
      `),
      'c',
    ),
  )

  const tasksDueToday = num(
    rowVal(
      firstRow(await sql`
        SELECT
          (SELECT COUNT(*)::int FROM tasks WHERE due_at::date = CURRENT_DATE AND status NOT IN ('done', 'cancelled', 'completed'))
          + (SELECT COUNT(*)::int FROM milestones WHERE due_at::date = CURRENT_DATE AND completed_at IS NULL) AS c
      `),
      'c',
    ),
  )

  const projectBuckets = firstRow(await sql`
    SELECT
      COUNT(*) FILTER (
        WHERE status NOT IN ('completed', 'cancelled', 'archived', 'delayed', 'awaiting_client')
          AND COALESCE(progress_pct, 0) >= 40
          AND (target_end_date IS NULL OR target_end_date > CURRENT_DATE + interval '7 days')
      )::int AS healthy,
      COUNT(*) FILTER (
        WHERE target_end_date IS NOT NULL
          AND target_end_date <= CURRENT_DATE + interval '7 days'
          AND target_end_date >= CURRENT_DATE
          AND status NOT IN ('completed', 'cancelled')
      )::int AS near_deadline,
      COUNT(*) FILTER (WHERE status = 'on_hold')::int AS blocked,
      COUNT(*) FILTER (WHERE status = 'awaiting_client')::int AS waiting_client,
      COUNT(*) FILTER (WHERE status = 'delayed')::int AS delayed
    FROM projects
    WHERE status NOT IN ('completed', 'cancelled', 'archived')
  `)

  const projectRiskItems = (await sql`
    SELECT
      p.id::text,
      p.name AS project_name,
      COALESCE(c.company, c.name, '—') AS client_name,
      CASE
        WHEN p.status = 'delayed' THEN 'high'
        WHEN p.target_end_date IS NOT NULL AND p.target_end_date < CURRENT_DATE THEN 'high'
        WHEN p.status = 'awaiting_client' THEN 'medium'
        WHEN p.target_end_date IS NOT NULL AND p.target_end_date <= CURRENT_DATE + interval '7 days' THEN 'medium'
        ELSE 'low'
      END AS risk_level,
      CASE
        WHEN p.status = 'delayed' THEN 'Delayed'
        WHEN p.status = 'awaiting_client' THEN 'Waiting client'
        WHEN p.target_end_date IS NOT NULL AND p.target_end_date < CURRENT_DATE THEN 'Overdue'
        WHEN p.target_end_date IS NOT NULL AND p.target_end_date <= CURRENT_DATE + interval '7 days' THEN 'Near deadline'
        WHEN p.status = 'on_hold' THEN 'Blocked'
        ELSE 'Healthy'
      END AS risk_label,
      COALESCE(p.target_end_date, (SELECT MIN(m.due_at)::date FROM milestones m WHERE m.project_id = p.id AND m.completed_at IS NULL)) AS due_date
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.status NOT IN ('completed', 'cancelled', 'archived')
    ORDER BY
      CASE WHEN p.status = 'delayed' THEN 0 WHEN p.status = 'awaiting_client' THEN 1 WHEN p.target_end_date <= CURRENT_DATE + interval '7 days' THEN 2 ELSE 3 END,
      due_date ASC NULLS LAST
    LIMIT 12
  `) as {
    id: string
    project_name: string
    client_name: string
    risk_level: string
    risk_label: string
    due_date: string | null
  }[]

  const teamMembers = (await sql`
    SELECT
      u.id::text AS user_id,
      COALESCE(u.email, 'Team member') AS name,
      COALESCE(u.curvvtech_role, 'member') AS role,
      COUNT(t.id) FILTER (WHERE t.status NOT IN ('done', 'cancelled', 'completed'))::int AS open_tasks
    FROM users u
    LEFT JOIN tasks t ON t.assignee_user_id = u.id::text
    WHERE u.curvvtech_role IS NOT NULL
    GROUP BY u.id, u.email, u.curvvtech_role
    ORDER BY open_tasks DESC
    LIMIT 8
  `) as { user_id: string; name: string; role: string; open_tasks: number }[]

  const awaitingProposal = firstRow(await sql`
    SELECT id::text, COALESCE(client_name, title, 'Client') AS label, sent_at::text
    FROM proposals WHERE status IN ('sent', 'viewed')
    ORDER BY sent_at ASC NULLS LAST LIMIT 1
  `) as { id: string; label: string; sent_at: string | null } | null

  const draftInvoice = firstRow(await sql`
    SELECT id::text, invoice_number FROM invoices WHERE status = 'draft' ORDER BY "updatedAt" DESC LIMIT 1
  `) as { id: string; invoice_number: string } | null

  let changeOrderPending = 0
  try {
    changeOrderPending = num(
      rowVal(firstRow(await sql`SELECT COUNT(*)::int AS c FROM project_change_orders WHERE approval_status = 'pending'`), 'c'),
    )
  } catch {
    changeOrderPending = 0
  }

  const profitMonth = revenue.profit_this_month_cents
  const revenueMonth = revenue.paid_this_month_cents
  const marginPct = revenueMonth > 0 ? Math.round((profitMonth / revenueMonth) * 100) : 0

  const financeScore = clampScore(
    marginPct * 0.4 +
      (revenue.outstanding_cents === 0 ? 35 : Math.max(0, 35 - (revenue.outstanding_cents / Math.max(revenueMonth, 1)) * 15)) +
      (snapshot.overdue_invoices === 0 ? 25 : Math.max(0, 25 - snapshot.overdue_invoices * 8)),
  )

  const deliveryScore = clampScore(projects.average_health_pct || (projects.active > 0 ? 50 : 0))
  const salesScore = clampScore(
    Math.min(40, pipeline.open_leads * 8) + pipeline.expected_close_pct * 0.4 + Math.min(20, snapshot.new_leads_today * 5),
  )
  const operationsScore = clampScore(100 - overdueTasks * 8 - snapshot.overdue_invoices * 5)
  const clientScore = clampScore(
    overview.client_health.length > 0
      ? overview.client_health.reduce((s, c) => s + c.health_pct, 0) / overview.client_health.length
      : 88,
  )
  const teamScore = clampScore(100 - Math.abs(overview.team_utilization_pct - 70) * 0.8)

  const businessScore = clampScore(
    (financeScore + deliveryScore + salesScore + operationsScore + clientScore + teamScore) / 6,
  )

  const thisWeek = num(rowVal(weekRevenueRow, 'this_week_cents'))
  const lastWeek = num(rowVal(weekRevenueRow, 'last_week_cents'))
  const scoreDeltaWeek =
    lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 10) : thisWeek > 0 ? 4 : 0

  const priorities = (ai.today_priorities ?? []).slice(0, 5).map((p, i) => ({
    rank: i + 1,
    label: p.label,
    href: p.href,
  }))

  const narrative: string[] = []
  if (revenue.mom_change_pct > 0) narrative.push(`Revenue increased ${revenue.mom_change_pct}% vs last month.`)
  else if (revenue.mom_change_pct < 0) narrative.push(`Revenue is down ${Math.abs(revenue.mom_change_pct)}% vs last month.`)
  else narrative.push('Revenue is steady month over month.')

  if (num(rowVal(projectBuckets, 'delayed')) === 0 && num(rowVal(projectBuckets, 'near_deadline')) === 0) {
    narrative.push('No projects at critical risk.')
  } else {
    const riskParts = []
    if (num(rowVal(projectBuckets, 'delayed')) > 0) riskParts.push(`${num(rowVal(projectBuckets, 'delayed'))} delayed`)
    if (num(rowVal(projectBuckets, 'near_deadline')) > 0) riskParts.push(`${num(rowVal(projectBuckets, 'near_deadline'))} near deadline`)
    narrative.push(`${riskParts.join(', ')} — review delivery.`)
  }

  if (revenue.outstanding_cents > 0) {
    narrative.push(`Collections due: ₹${Math.round(revenue.outstanding_cents / 100).toLocaleString('en-IN')}.`)
  }

  if (proposalsAwaiting > 0) {
    narrative.push(`${proposalsAwaiting} proposal${proposalsAwaiting === 1 ? '' : 's'} awaiting response.`)
  }

  const recommendation =
    ai.recommendation ||
    (awaitingProposal
      ? `Follow ${awaitingProposal.label} today.`
      : 'Focus on delivery and collections this week.')

  const rankedActions: {
    priority: 'critical' | 'medium' | 'low'
    label: string
    detail?: string
    href: string
  }[] = []

  if (awaitingProposal) {
    const pendingDays = daysSince(awaitingProposal.sent_at)
    rankedActions.push({
      priority: 'critical',
      label: `Follow ${awaitingProposal.label} proposal`,
      detail: pendingDays != null ? `${pendingDays} days pending` : 'Awaiting response',
      href: `/proposals/${awaitingProposal.id}`,
    })
  }

  if (snapshot.overdue_invoices > 0) {
    rankedActions.push({
      priority: 'critical',
      label: 'Chase overdue invoices',
      detail: `${snapshot.overdue_invoices} overdue`,
      href: '/invoices?status=sent',
    })
  }

  if (draftInvoice) {
    rankedActions.push({
      priority: 'medium',
      label: `Generate invoice ${draftInvoice.invoice_number || ''}`.trim(),
      href: `/invoices/${draftInvoice.id}`,
    })
  }

  if (changeOrderPending > 0) {
    rankedActions.push({
      priority: 'medium',
      label: 'Review change requests',
      detail: `${changeOrderPending} pending`,
      href: '/projects',
    })
  }

  for (const action of (ai.suggested_actions ?? []).slice(0, 2)) {
    if (!rankedActions.some((a) => a.href === action.href)) {
      rankedActions.push({ priority: 'low', label: action.label, href: action.href })
    }
  }

  if (rankedActions.length === 0) {
    rankedActions.push({ priority: 'low', label: 'Review pipeline', href: '/leads' })
  }

  const weeklyWins: { label: string }[] = []
  if (num(rowVal(yesterdayRow, 'collected_cents')) > 0) {
    weeklyWins.push({
      label: `Collected ₹${Math.round(num(rowVal(yesterdayRow, 'collected_cents')) / 100).toLocaleString('en-IN')} yesterday`,
    })
  }
  if (revenueMonth > 0) {
    weeklyWins.push({ label: `Revenue +${Math.round(revenueMonth / 100).toLocaleString('en-IN')} this month` })
  }
  if (num(rowVal(yesterdayRow, 'leads_created')) > 0) {
    weeklyWins.push({ label: `${num(rowVal(yesterdayRow, 'leads_created'))} new lead(s) yesterday` })
  }
  if (num(rowVal(yesterdayRow, 'milestones_completed')) > 0) {
    weeklyWins.push({ label: `${num(rowVal(yesterdayRow, 'milestones_completed'))} milestone(s) completed` })
  }
  for (const h of (ai.project_highlights ?? []).filter((p) => p.progress_pct >= 100).slice(0, 2)) {
    weeklyWins.push({ label: `${h.name} delivered` })
  }
  if (weeklyWins.length === 0) {
    weeklyWins.push({ label: 'Operations running smoothly' })
  }

  const pendingApprovals: { kind: string; label: string; href: string }[] = []
  if (awaitingProposal) {
    pendingApprovals.push({ kind: 'proposal', label: awaitingProposal.label, href: `/proposals/${awaitingProposal.id}` })
  }
  if (draftInvoice) {
    pendingApprovals.push({
      kind: 'invoice',
      label: draftInvoice.invoice_number || 'Draft invoice',
      href: `/invoices/${draftInvoice.id}`,
    })
  }
  if (changeOrderPending > 0) {
    pendingApprovals.push({ kind: 'change_order', label: 'Change request', href: '/projects' })
  }

  const watchList: { label: string; status: string; href: string }[] = []
  for (const p of (ai.project_highlights ?? []).slice(0, 3)) {
    watchList.push({
      label: p.name,
      status: p.status === 'awaiting_client' ? 'Waiting' : `${p.progress_pct}%`,
      href: p.href,
    })
  }
  if (awaitingProposal) {
    watchList.push({ label: awaitingProposal.label, status: 'Pending', href: `/proposals/${awaitingProposal.id}` })
  }

  const avgDeal =
    pipeline.open_leads > 0 ? Math.round(pipeline.pipeline_value_cents / pipeline.open_leads) : 0
  const expectedClose = Math.round(pipeline.pipeline_value_cents * (pipeline.expected_close_pct / 100))

  const monthlyRows = overview.monthly_chart ?? []
  const dailyRows = overview.daily_chart ?? []

  const forecastChart = monthlyRows.slice(-3).map((m, i) => ({
    period: m.month,
    expected: (m.collections + (i === 2 ? pipeline.pipeline_value_cents / 100 * 0.2 : 0)),
  }))

  return {
    hero: {
      business_score: businessScore,
      business_score_delta_week: scoreDeltaWeek,
      revenue_today_cents: revenue.paid_today_cents,
      revenue_month_cents: revenueMonth,
      active_projects: projects.active,
      collections_due_cents: revenue.outstanding_cents,
      pipeline_value_cents: pipeline.pipeline_value_cents,
      open_leads: pipeline.open_leads,
      date_label: new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    },
    priorities,
    business_score_breakdown: {
      overall: businessScore,
      delta_week: scoreDeltaWeek,
      finance: financeScore,
      delivery: deliveryScore,
      sales: salesScore,
      operations: operationsScore,
      clients: clientScore,
      team: teamScore,
      revenue: clampScore(Math.min(100, revenue.mom_change_pct > 0 ? 70 + revenue.mom_change_pct : 60)),
      projects: deliveryScore,
    },
    founder_brief: {
      narrative,
      recommendation,
      yesterday: [
        {
          label: 'Collected',
          value: `₹${Math.round(num(rowVal(yesterdayRow, 'collected_cents')) / 100).toLocaleString('en-IN')}`,
        },
        {
          label: 'Completed',
          value: `${num(rowVal(yesterdayRow, 'milestones_completed'))} milestone${num(rowVal(yesterdayRow, 'milestones_completed')) === 1 ? '' : 's'}`,
        },
        {
          label: 'Created',
          value: `${num(rowVal(yesterdayRow, 'leads_created'))} lead${num(rowVal(yesterdayRow, 'leads_created')) === 1 ? '' : 's'}`,
        },
      ],
      today: [
        { label: 'Proposals', value: String(proposalsAwaiting) },
        { label: 'Projects', value: String(projects.active) },
        { label: 'Overdue', value: String(snapshot.overdue_invoices) },
      ],
      watch: watchList,
    },
    ranked_actions: rankedActions.slice(0, 6),
    money: {
      cash_cents: num(rowVal(company, 'cash_in_bank_cents')),
      receivables_cents: revenue.outstanding_cents,
      payables_cents: num(rowVal(payablesRow, 'payables_cents')),
      profit_month_cents: profitMonth,
      expenses_month_cents: revenue.expenses_this_month_cents,
      forecast_cents: widgets.revenue_forecast_cents,
      gst_liability_cents: num(rowVal(gstRow, 'gst_cents')),
      margin_pct: marginPct,
      pipeline_value_cents: pipeline.pipeline_value_cents,
      revenue_month_cents: revenueMonth,
    },
    business_health: {
      delivery: deliveryScore,
      finance: financeScore,
      sales: salesScore,
      marketing: clampScore(salesScore * 0.85 + snapshot.new_leads_today * 3),
      support: clientScore,
    },
    team: {
      utilization_pct: overview.team_utilization_pct,
      tasks_due_today: tasksDueToday,
      overdue_tasks: overdueTasks,
      available_capacity_pct: Math.max(0, 100 - overview.team_utilization_pct),
      members: teamMembers.map((m) => ({
        user_id: m.user_id,
        name: m.name.split('@')[0] ?? m.name,
        role: m.role,
        utilization_pct: Math.min(100, m.open_tasks * 15),
        open_tasks: m.open_tasks,
      })),
    },
    pipeline_forecast: {
      confidence_pct: pipeline.expected_close_pct,
      expected_close_cents: expectedClose,
      average_deal_cents: avgDeal,
      open_leads: pipeline.open_leads,
      chart: forecastChart,
    },
    project_risks: {
      healthy: num(rowVal(projectBuckets, 'healthy')),
      near_deadline: num(rowVal(projectBuckets, 'near_deadline')),
      blocked: num(rowVal(projectBuckets, 'blocked')),
      waiting_client: num(rowVal(projectBuckets, 'waiting_client')),
      delayed: num(rowVal(projectBuckets, 'delayed')),
      items: projectRiskItems,
    },
    widgets: {
      weekly_wins: weeklyWins,
      burn_rate_cents: revenue.expenses_this_month_cents,
      calendar: widgets.calendar_events ?? [],
      pending_approvals: pendingApprovals,
      growth: {
        mrr_cents: revenueMonth,
        revenue_month_cents: revenueMonth,
        active_projects: projects.active,
      },
      client_satisfaction: clientScore >= 90 ? 4.9 : clientScore >= 75 ? 4.5 : 4.2,
      notifications: widgets.notifications ?? [],
    },
    charts: {
      revenue_trend: monthlyRows.map((m) => ({ month: m.month, revenue: m.collections })),
      cash_flow: monthlyRows.map((m) => ({
        month: m.month,
        money_in: m.collections,
        money_out: m.expenses,
        net: m.profit,
      })),
      daily_revenue: dailyRows.map((d) => ({
        period: d.period,
        revenue: d.collections,
        profit: d.profit,
      })),
    },
  }
}
