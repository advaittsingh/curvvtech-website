import { sql, firstRow } from '../../../lib/sqlPool.js'

function num(v: unknown): number {
  return Number(v ?? 0)
}

function rowVal(row: unknown, key: string): unknown {
  return row && typeof row === 'object' ? (row as Record<string, unknown>)[key] : undefined
}

function stageConversion(funnelMap: Record<string, number>, from: string, to: string): number {
  const a = funnelMap[from] ?? 0
  const b = funnelMap[to] ?? 0
  if (a <= 0) return b > 0 ? 100 : 0
  return Math.round((b / a) * 100)
}

const LEAD_STAGE_DEFAULT_CENTS: Record<string, number> = {
  new: 1000000,
  qualified: 1500000,
  contacted: 1500000,
  discovery_call: 2500000,
  in_discussion: 2500000,
  proposal_sent: 5000000,
  negotiation: 8000000,
}

const LEAD_STAGE_CLOSE_PCT: Record<string, number> = {
  new: 10,
  qualified: 25,
  contacted: 25,
  discovery_call: 40,
  in_discussion: 40,
  proposal_sent: 55,
  negotiation: 75,
  won: 100,
  lost: 0,
}

function parseLeadBudgetCents(budget: string | null | undefined): number | null {
  if (!budget) return null
  const s = budget.toLowerCase().replace(/,/g, '')
  const lakh = s.match(/([\d.]+)\s*l(?:akh)?/)
  if (lakh) return Math.round(Number(lakh[1]) * 100000 * 100)
  const k = s.match(/([\d.]+)\s*k/)
  if (k) return Math.round(Number(k[1]) * 1000 * 100)
  const n = Number(s.replace(/[^\d.]/g, ''))
  if (!n || Number.isNaN(n)) return null
  return n >= 100000 ? Math.round(n) : Math.round(n * 100)
}

function effectiveLeadValueCents(row: {
  deal_value_cents?: unknown
  budget?: unknown
  status?: unknown
}): number {
  const deal = num(row.deal_value_cents)
  if (deal > 0) return deal
  const fromBudget = parseLeadBudgetCents(row.budget != null ? String(row.budget) : null)
  if (fromBudget && fromBudget > 0) return fromBudget
  const st = String(row.status ?? 'new').toLowerCase()
  return LEAD_STAGE_DEFAULT_CENTS[st] ?? 1000000
}

function buildPipelineMetrics(rows: { deal_value_cents?: unknown; budget?: unknown; status?: unknown }[]) {
  let pipelineValueCents = 0
  let bookedValueCents = 0
  let expectedCloseTotal = 0

  for (const row of rows) {
    pipelineValueCents += effectiveLeadValueCents(row)
    bookedValueCents += num(row.deal_value_cents)
    const st = String(row.status ?? 'new').toLowerCase()
    expectedCloseTotal += LEAD_STAGE_CLOSE_PCT[st] ?? 10
  }

  const openLeads = rows.length
  const expectedClosePct = openLeads > 0 ? Math.round(expectedCloseTotal / openLeads) : 0

  return { openLeads, pipelineValueCents, bookedValueCents, expectedClosePct }
}

function formatActivityMessage(row: Record<string, unknown>): string {
  const action = String(row.action ?? 'Activity')
  const entity = row.entity_type ? String(row.entity_type) : ''
  const details = row.details as Record<string, unknown> | null
  const label = details?.label ?? details?.name ?? details?.title ?? entity
  return label ? `${action} · ${label}` : action
}

function activityIcon(action: string, entityType?: string): string {
  const a = action.toLowerCase()
  const e = (entityType ?? '').toLowerCase()
  if (a.includes('payment') || a.includes('paid')) return 'payment'
  if (a.includes('invoice')) return 'invoice'
  if (a.includes('lead')) return 'lead'
  if (a.includes('proposal')) return 'proposal'
  if (a.includes('project') || e === 'project') return 'project'
  if (a.includes('milestone') || a.includes('task')) return 'task'
  if (a.includes('demo')) return 'demo'
  if (a.includes('file')) return 'file'
  return 'activity'
}

async function buildAiAssistant(input: {
  followUpsDue: number
  outstandingCents: number
  pendingInvoices: number
  overdueInvoices: number
  projectsAtRisk: number
  proposalsAwaiting: number
  revenueTodayCents: number
  revenueChangePct: number
  newLeadsToday: number
  momPct: number
  profitMonthCents: number
  activeProjects: number
  pipelineValueCents: number
}) {
  const todayPriorities: { label: string; href: string; kind: string }[] = []
  const suggested: { label: string; href: string }[] = []

  const topDue = firstRow(await sql`
    SELECT (array_agg(i.id ORDER BY i.amount_cents DESC))[1]::text AS id,
           COALESCE(c.company, c.name, 'Client') AS client_name,
           SUM(i.amount_cents)::bigint AS cents
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.status IN ('sent', 'draft')
    GROUP BY c.id, c.company, c.name
    ORDER BY cents DESC LIMIT 1
  `) as { id: string; client_name: string; cents: string } | null

  if (topDue) {
    todayPriorities.push({
      label: `Send invoice to ${topDue.client_name}`,
      href: `/invoices/${topDue.id}`,
      kind: 'invoice',
    })
    suggested.push({ label: `Send ${topDue.client_name} invoice`, href: `/invoices/${topDue.id}` })
  }

  const projectHighlights = (await sql`
    SELECT p.id::text, p.name AS project_name, COALESCE(c.company, c.name, 'Client') AS client_name,
           p.progress_pct, p.status
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.status NOT IN ('completed', 'cancelled', 'archived')
    ORDER BY
      CASE WHEN p.progress_pct >= 80 THEN 0 WHEN p.status = 'awaiting_client' THEN 1 ELSE 2 END,
      p."updatedAt" DESC
    LIMIT 4
  `) as { id: string; project_name: string; client_name: string; progress_pct: number; status: string }[]

  for (const p of projectHighlights.slice(0, 3)) {
    const label =
      p.progress_pct >= 80
        ? `${p.project_name} nearing delivery`
        : p.status === 'awaiting_client'
          ? `${p.project_name} waiting for client review`
          : p.status === 'completed'
            ? `${p.project_name} completed`
            : `${p.project_name} in progress (${p.progress_pct}%)`
    todayPriorities.push({ label, href: `/projects/${p.id}`, kind: 'project' })
  }

  const nearing = projectHighlights.find((p) => p.progress_pct >= 80)
  if (nearing) {
    suggested.push({ label: `Finish ${nearing.project_name}`, href: `/projects/${nearing.id}` })
  }

  const awaitingProposal = firstRow(await sql`
    SELECT id::text, COALESCE(client_name, title, 'Client') AS label
    FROM proposals WHERE status IN ('sent', 'viewed')
    ORDER BY sent_at DESC NULLS LAST LIMIT 1
  `) as { id: string; label: string } | null
  if (awaitingProposal) {
    suggested.push({ label: `Review proposal — ${awaitingProposal.label}`, href: `/proposals/${awaitingProposal.id}` })
  }

  const draftInv = firstRow(await sql`
    SELECT id::text, invoice_number FROM invoices WHERE status = 'draft'
    ORDER BY "updatedAt" DESC LIMIT 1
  `) as { id: string; invoice_number: string } | null
  if (draftInv) {
    suggested.push({ label: `Upload invoice ${draftInv.invoice_number || ''}`.trim(), href: `/invoices/${draftInv.id}` })
  }

  if (input.followUpsDue > 0) {
    suggested.push({ label: 'Follow up clients', href: '/leads' })
    if (todayPriorities.length < 5) {
      todayPriorities.push({ label: `${input.followUpsDue} leads need follow-up`, href: '/leads', kind: 'leads' })
    }
  }

  if (input.overdueInvoices > 0) {
    todayPriorities.push({
      label: `${input.overdueInvoices} overdue invoice${input.overdueInvoices === 1 ? '' : 's'}`,
      href: '/invoices?status=sent',
      kind: 'invoice',
    })
  }

  const insights: { label: string; trend?: 'up' | 'down' | 'neutral' }[] = []
  if (input.momPct !== 0) {
    insights.push({
      label: `Revenue is ${input.momPct >= 0 ? 'up' : 'down'} ${Math.abs(input.momPct)}% vs last month`,
      trend: input.momPct >= 0 ? 'up' : 'down',
    })
  } else if (input.revenueChangePct !== 0) {
    insights.push({
      label: `Collections ${input.revenueChangePct >= 0 ? 'up' : 'down'} ${Math.abs(input.revenueChangePct)}% vs yesterday`,
      trend: input.revenueChangePct >= 0 ? 'up' : 'down',
    })
  }
  if (input.activeProjects > 0) {
    insights.push({ label: `${input.activeProjects} active project${input.activeProjects === 1 ? '' : 's'}`, trend: 'neutral' })
  }
  if (input.overdueInvoices === 0) {
    insights.push({ label: 'No overdue invoices', trend: 'up' })
  } else {
    insights.push({ label: `${input.overdueInvoices} invoice${input.overdueInvoices === 1 ? '' : 's'} overdue`, trend: 'down' })
  }
  if (input.newLeadsToday > 0) {
    insights.push({ label: `${input.newLeadsToday} new lead${input.newLeadsToday === 1 ? '' : 's'} today`, trend: 'up' })
  }

  let recommendation = 'Operations look healthy — focus on pipeline growth today.'
  if (nearing) {
    recommendation = `Complete ${nearing.project_name} this week to improve delivery score and client satisfaction.`
  } else if (topDue) {
    recommendation = `Collect ${topDue.client_name}'s outstanding balance to improve cash flow this week.`
  } else if (input.proposalsAwaiting > 0) {
    recommendation = 'Follow up on sent proposals — deals are waiting for your response.'
  } else if (input.projectsAtRisk > 0) {
    recommendation = `Review ${input.projectsAtRisk} at-risk project${input.projectsAtRisk === 1 ? '' : 's'} before deadlines slip.`
  }

  if (suggested.length < 4) suggested.push({ label: 'Generate weekly report', href: '/ceo' })
  if (suggested.length < 5) suggested.push({ label: 'Open AI workspace', href: '/ai' })

  return {
    daily_summary: {
      revenue_today_cents: input.revenueTodayCents,
      collections_due_cents: input.outstandingCents,
      collections_due_client: topDue?.client_name ?? null,
      profit_month_cents: input.profitMonthCents,
      active_projects: input.activeProjects,
      pipeline_value_cents: input.pipelineValueCents,
    },
    project_highlights: projectHighlights.map((p) => ({
      id: p.id,
      name: p.project_name,
      client_name: p.client_name,
      progress_pct: Number(p.progress_pct ?? 0),
      status: p.status,
      href: `/projects/${p.id}`,
    })),
    recommendation,
    today_priorities: todayPriorities.slice(0, 5),
    insights: insights.slice(0, 5),
    suggested_actions: suggested.slice(0, 5),
    stats: {
      overdue_follow_ups: input.followUpsDue,
      pending_payments_cents: input.outstandingCents,
      pending_invoices: input.pendingInvoices,
      overdue_invoices: input.overdueInvoices,
      projects_at_risk: input.projectsAtRisk,
      proposals_awaiting: input.proposalsAwaiting,
      revenue_today_cents: input.revenueTodayCents,
      revenue_today_change_pct: input.revenueChangePct,
    },
  }
}

export async function buildDashboardOverview() {
  const revenueRow = firstRow(await sql`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END), 0)::bigint AS paid_all_time_cents,
      COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= date_trunc('day', NOW()) THEN amount_cents ELSE 0 END), 0)::bigint AS paid_today_cents,
      COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= date_trunc('day', NOW() - interval '1 day') AND paid_at < date_trunc('day', NOW()) THEN amount_cents ELSE 0 END), 0)::bigint AS paid_yesterday_cents,
      COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= date_trunc('month', NOW()) THEN amount_cents ELSE 0 END), 0)::bigint AS paid_this_month_cents,
      COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= date_trunc('month', NOW() - interval '1 month') AND paid_at < date_trunc('month', NOW()) THEN amount_cents ELSE 0 END), 0)::bigint AS paid_last_month_cents,
      COALESCE(SUM(CASE WHEN status IN ('sent', 'draft') THEN amount_cents ELSE 0 END), 0)::bigint AS outstanding_cents,
      COUNT(*) FILTER (WHERE status IN ('sent', 'draft'))::int AS pending_invoice_count
    FROM invoices
  `)

  const expensesMonthRow = firstRow(await sql`
    SELECT COALESCE(SUM(amount_cents), 0)::bigint AS expense_cents
    FROM expenses WHERE expense_date >= date_trunc('month', NOW())
  `)

  const paidToday = num(rowVal(revenueRow, 'paid_today_cents'))
  const paidYesterday = num(rowVal(revenueRow, 'paid_yesterday_cents'))
  const paidThisMonth = num(rowVal(revenueRow, 'paid_this_month_cents'))
  const paidLastMonth = num(rowVal(revenueRow, 'paid_last_month_cents'))
  const expensesThisMonth = num(rowVal(expensesMonthRow, 'expense_cents'))
  const profitThisMonth = paidThisMonth - expensesThisMonth

  const todayChangePct =
    paidYesterday > 0
      ? Math.round(((paidToday - paidYesterday) / paidYesterday) * 100)
      : paidToday > 0
        ? 100
        : 0
  const momPct =
    paidLastMonth > 0
      ? Math.round(((paidThisMonth - paidLastMonth) / paidLastMonth) * 100)
      : paidThisMonth > 0
        ? 100
        : 0

  const monthlyRows = (await sql`
    WITH months AS (
      SELECT generate_series(
        date_trunc('month', NOW()) - interval '11 months',
        date_trunc('month', NOW()),
        interval '1 month'
      )::date AS month_start
    )
    SELECT
      to_char(m.month_start, 'Mon') AS month_label,
      m.month_start,
      COALESCE((SELECT SUM(i.amount_cents)::bigint FROM invoices i WHERE i.status = 'paid' AND i.paid_at >= m.month_start AND i.paid_at < m.month_start + interval '1 month'), 0) AS payments_received_cents,
      COALESCE((SELECT SUM(i.amount_cents)::bigint FROM invoices i WHERE i.status IN ('sent', 'draft') AND i."createdAt" >= m.month_start AND i."createdAt" < m.month_start + interval '1 month'), 0) AS outstanding_cents,
      COALESCE((SELECT SUM(i.amount_cents)::bigint FROM invoices i WHERE i."createdAt" >= m.month_start AND i."createdAt" < m.month_start + interval '1 month'), 0) AS revenue_cents,
      COALESCE((SELECT SUM(e.amount_cents)::bigint FROM expenses e WHERE e.expense_date >= m.month_start AND e.expense_date < (m.month_start + interval '1 month')::date), 0) AS expenses_cents
    FROM months m ORDER BY m.month_start ASC
  `) as {
    month_label: string
    payments_received_cents: string | number
    outstanding_cents: string | number
    revenue_cents: string | number
    expenses_cents: string | number
  }[]

  const dailyRows = (await sql`
    WITH days AS (
      SELECT generate_series(
        date_trunc('day', NOW()) - interval '6 days',
        date_trunc('day', NOW()),
        interval '1 day'
      )::date AS day_start
    )
    SELECT
      to_char(d.day_start, 'Mon DD') AS day_label,
      d.day_start,
      COALESCE((SELECT SUM(i.amount_cents)::bigint FROM invoices i WHERE i.status = 'paid' AND i.paid_at >= d.day_start AND i.paid_at < d.day_start + interval '1 day'), 0) AS collections_cents,
      COALESCE((SELECT SUM(e.amount_cents)::bigint FROM expenses e WHERE e.expense_date = d.day_start), 0) AS expenses_cents
    FROM days d ORDER BY d.day_start ASC
  `) as { day_label: string; collections_cents: string | number; expenses_cents: string | number }[]

  const snapshotRow = firstRow(await sql`
    SELECT
      (SELECT COUNT(*)::int FROM crm_leads WHERE "createdAt" >= date_trunc('day', NOW())) AS new_leads_today,
      (SELECT COUNT(*)::int FROM crm_leads WHERE status IN ('qualified', 'discovery_call', 'proposal_sent', 'negotiation', 'contacted', 'in_discussion')) AS qualified_leads,
      (SELECT COUNT(*)::int FROM crm_leads WHERE status NOT IN ('won', 'lost', 'closed')) AS follow_ups_due,
      (SELECT COUNT(*)::int FROM projects WHERE status NOT IN ('completed', 'cancelled', 'archived')) AS active_projects,
      (SELECT COUNT(*)::int FROM projects WHERE status NOT IN ('completed', 'cancelled') AND progress_pct >= 80) AS projects_nearing_completion,
      (SELECT COUNT(*)::int FROM milestones WHERE due_at IS NOT NULL AND due_at <= NOW() AND completed_at IS NULL)
        + (SELECT COUNT(*)::int FROM tasks WHERE due_at <= NOW() AND status NOT IN ('done', 'cancelled', 'completed')) AS tasks_due_today,
      (SELECT COUNT(*)::int FROM invoices WHERE status = 'sent' AND due_at IS NOT NULL AND due_at < NOW()) AS overdue_invoices,
      (SELECT COUNT(*)::int FROM milestones WHERE due_at::date = CURRENT_DATE AND completed_at IS NULL) AS meetings_today
  `)

  const collectionsWeekRow = firstRow(await sql`
    SELECT COALESCE(SUM(amount_cents), 0)::bigint AS cents, COUNT(*)::int AS cnt
    FROM invoices
    WHERE status IN ('sent', 'draft')
      AND due_at IS NOT NULL
      AND due_at >= date_trunc('week', NOW())
      AND due_at < date_trunc('week', NOW()) + interval '7 days'
  `)

  const forecastRow = firstRow(await sql`
    SELECT
      COALESCE(SUM(CASE WHEN status IN ('sent', 'draft') AND due_at >= date_trunc('month', NOW()) AND due_at < date_trunc('month', NOW()) + interval '1 month' THEN amount_cents ELSE 0 END), 0)::bigint AS invoiced_due_cents
    FROM invoices
  `)

  const teamRow = firstRow(await sql`
    SELECT
      COUNT(*) FILTER (WHERE curvvtech_role IS NOT NULL)::int AS team_count,
      (SELECT COUNT(*)::int FROM projects WHERE status IN ('active', 'planning', 'review', 'in_progress')) AS active_delivery
    FROM users
  `)
  const teamCount = Math.max(num(rowVal(teamRow, 'team_count')), 1)
  const activeDelivery = num(rowVal(teamRow, 'active_delivery'))
  const teamUtilization = Math.min(100, Math.round((activeDelivery / (teamCount * 2)) * 100))

  const teamWorkload = (await sql`
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
    LIMIT 6
  `) as { user_id: string; name: string; role: string; open_tasks: number }[]

  const funnelRows = (await sql`
    SELECT status, COUNT(*)::int AS count FROM crm_leads GROUP BY status
  `) as { status: string; count: number }[]

  const funnelMap: Record<string, number> = {
    new: 0, qualified: 0, discovery_call: 0, proposal_sent: 0, negotiation: 0, won: 0, lost: 0,
  }
  for (const row of funnelRows) {
    const s = String(row.status ?? 'new').toLowerCase()
    if (s === 'contacted') funnelMap.qualified += row.count
    else if (s === 'in_discussion') funnelMap.discovery_call += row.count
    else if (s === 'closed') funnelMap.lost += row.count
    else if (s in funnelMap) funnelMap[s as keyof typeof funnelMap] += row.count
    else funnelMap.new += row.count
  }

  const funnelStages = ['new', 'qualified', 'discovery_call', 'proposal_sent', 'negotiation', 'won'] as const
  const leadFunnel = funnelStages.map((stage, i) => {
    const next = funnelStages[i + 1]
    return {
      stage,
      count: funnelMap[stage],
      conversion_pct: next ? stageConversion(funnelMap, stage, next) : funnelMap.won > 0 ? 100 : 0,
    }
  })

  const openLeadRows = (await sql`
    SELECT deal_value_cents, budget, status
    FROM crm_leads
    WHERE status NOT IN ('won', 'lost', 'closed')
  `) as { deal_value_cents?: unknown; budget?: unknown; status?: unknown }[]

  const { openLeads, pipelineValueCents, bookedValueCents, expectedClosePct } = buildPipelineMetrics(openLeadRows)
  const weightedPipelineCents = Math.round(
    openLeadRows.reduce((sum, row) => {
      const st = String(row.status ?? 'new').toLowerCase()
      const prob = (LEAD_STAGE_CLOSE_PCT[st] ?? 10) / 100
      return sum + effectiveLeadValueCents(row) * prob
    }, 0),
  )

  const projectsSummary = firstRow(await sql`
    SELECT
      COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled', 'archived'))::int AS active,
      COUNT(*) FILTER (WHERE status = 'awaiting_client')::int AS awaiting_client,
      COUNT(*) FILTER (WHERE status IN ('review', 'on_hold'))::int AS testing,
      COUNT(*) FILTER (WHERE status IN ('active', 'in_progress') AND progress_pct >= 70)::int AS deploying,
      ROUND(AVG(
        COALESCE(
          progress_pct,
          CASE status
            WHEN 'in_progress' THEN 50
            WHEN 'active' THEN 35
            WHEN 'planning' THEN 20
            WHEN 'review' THEN 60
            WHEN 'awaiting_client' THEN 70
            ELSE 25
          END
        )
      ))::int AS average_health_pct
    FROM projects
    WHERE status NOT IN ('completed', 'cancelled', 'archived')
  `)

  const projectHealth = firstRow(await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'delayed')::int AS delayed,
      COUNT(*) FILTER (WHERE status = 'awaiting_client')::int AS awaiting_client,
      COUNT(*) FILTER (
        WHERE status NOT IN ('completed', 'cancelled', 'archived', 'delayed', 'awaiting_client')
          AND COALESCE(progress_pct, 0) < 40
      )::int AS at_risk,
      COUNT(*) FILTER (
        WHERE status NOT IN ('completed', 'cancelled', 'archived', 'delayed', 'awaiting_client')
          AND COALESCE(progress_pct, 0) >= 40
      )::int AS on_track
    FROM projects
    WHERE status NOT IN ('completed', 'cancelled', 'archived')
  `)

  const clientHealth = (await sql`
    SELECT
      c.id::text,
      c.name,
      c.company,
      (
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount_cents ELSE 0 END), 0)
        + COALESCE((SELECT SUM(COALESCE(p2.budget_cents, 0)) FROM projects p2 WHERE p2.client_id = c.id), 0)
      )::bigint AS revenue_cents,
      COALESCE(SUM(CASE WHEN i.status IN ('sent', 'draft') THEN i.amount_cents ELSE 0 END), 0)::bigint AS outstanding_cents,
      COUNT(DISTINCT p.id) FILTER (WHERE p.status NOT IN ('completed', 'cancelled'))::int AS project_count,
      MAX(GREATEST(c."updatedAt", p."updatedAt"))::text AS last_contact_at,
      ROUND(AVG(COALESCE(p.progress_pct, 0)))::int AS health_pct,
      BOOL_OR(i.status = 'sent' AND i.due_at IS NOT NULL AND i.due_at < NOW()) AS invoice_overdue,
      COALESCE((array_agg(p.status ORDER BY p."updatedAt" DESC) FILTER (WHERE p.id IS NOT NULL))[1], 'none') AS project_status
    FROM clients c
    LEFT JOIN invoices i ON i.client_id = c.id
    LEFT JOIN projects p ON p.client_id = c.id AND p.status NOT IN ('completed', 'cancelled')
    WHERE c.deleted_at IS NULL AND c.is_archived = false
    GROUP BY c.id, c.name, c.company
    HAVING COUNT(DISTINCT p.id) > 0 OR COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount_cents ELSE 0 END), 0) > 0
    ORDER BY revenue_cents DESC, outstanding_cents DESC
    LIMIT 5
  `) as Record<string, unknown>[]

  const activityLogs = (await sql`
    SELECT id::text, action, entity_type, entity_id, details, clerk_user_id, "createdAt"
    FROM activity_logs ORDER BY "createdAt" DESC LIMIT 12
  `) as Record<string, unknown>[]

  type ActivityItem = {
    id: string
    message: string
    created_at: unknown
    event_type: string
    icon: string
    actor_name: string | null
    entity_type: string | null
    entity_id: string | null
    entity_name: string | null
    amount_cents: number | null
    href: string | null
  }

  let activity: ActivityItem[] = activityLogs.map((a) => {
    const details = a.details as Record<string, unknown> | null
    const entityType = a.entity_type ? String(a.entity_type) : null
    const entityId = a.entity_id ? String(a.entity_id) : null
    const entityName = details?.label ?? details?.name ?? details?.title ?? null
    const amountCents = details?.amount_cents != null ? num(details.amount_cents) : null
    let href: string | null = null
    if (entityType === 'project' && entityId) href = `/projects/${entityId}`
    else if (entityType === 'invoice' && entityId) href = `/invoices/${entityId}`
    else if (entityType === 'lead' && entityId) href = `/leads/${entityId}`
    else if (entityType === 'client' && entityId) href = `/clients/${entityId}`
    return {
      id: String(a.id),
      message: formatActivityMessage(a),
      created_at: a.createdAt,
      event_type: String(a.action ?? 'activity'),
      icon: activityIcon(String(a.action ?? ''), entityType ?? undefined),
      actor_name: details?.actor_name ? String(details.actor_name) : null,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName ? String(entityName) : null,
      amount_cents: amountCents,
      href,
    }
  })

  if (activity.length === 0) {
    const synthesized = (await sql`
      (SELECT 'lead' AS kind, l.id::text, COALESCE(l.name, l.company, l.email, 'Lead') AS title,
              NULL::bigint AS amount_cents, l."createdAt" AS ts, '/leads/' || l.id::text AS href
       FROM crm_leads l ORDER BY l."createdAt" DESC LIMIT 4)
      UNION ALL
      (SELECT 'payment', i.id::text, COALESCE(c.company, c.name, 'Client'),
              i.amount_cents, i.paid_at, '/invoices/' || i.id::text
       FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
       WHERE i.status = 'paid' AND i.paid_at IS NOT NULL ORDER BY i.paid_at DESC LIMIT 4)
      UNION ALL
      (SELECT 'invoice', i.id::text, COALESCE(c.company, c.name, 'Client'),
              i.amount_cents, i."createdAt", '/invoices/' || i.id::text
       FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
       WHERE i.status = 'sent' ORDER BY i."createdAt" DESC LIMIT 3)
      ORDER BY ts DESC LIMIT 12
    `) as { kind: string; id: string; title: string; amount_cents: string | null; ts: string; href: string }[]

    activity = synthesized.map((row) => ({
      id: row.id,
      message:
        row.kind === 'payment'
          ? `Payment received — ${row.title}`
          : row.kind === 'invoice'
            ? `Invoice sent — ${row.title}`
            : `New lead — ${row.title}`,
      created_at: row.ts,
      event_type: row.kind,
      icon: row.kind === 'payment' ? 'payment' : row.kind === 'invoice' ? 'invoice' : 'lead',
      actor_name: null,
      entity_type: row.kind,
      entity_id: row.id,
      entity_name: row.title,
      amount_cents: row.amount_cents != null ? num(row.amount_cents) : null,
      href: row.href,
    }))
  }

  const upcomingDeadlines = (await sql`
    SELECT p.id::text AS project_id, p.name AS project_name,
           COALESCE(c.company, c.name, 'Client') AS client_name,
           COALESCE(p.target_end_date, (SELECT MIN(m.due_at)::date FROM milestones m WHERE m.project_id = p.id AND m.completed_at IS NULL))::text AS due_date
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.status NOT IN ('completed', 'cancelled', 'archived')
      AND COALESCE(p.target_end_date, (SELECT MIN(m.due_at) FROM milestones m WHERE m.project_id = p.id AND m.completed_at IS NULL)) IS NOT NULL
      AND COALESCE(p.target_end_date, (SELECT MIN(m.due_at)::date FROM milestones m WHERE m.project_id = p.id AND m.completed_at IS NULL))
          <= CURRENT_DATE + interval '14 days'
    ORDER BY due_date ASC LIMIT 5
  `) as { project_id: string; project_name: string; client_name: string; due_date: string }[]

  const recentPayments = (await sql`
    SELECT i.id::text, i.amount_cents, COALESCE(c.company, c.name, 'Client') AS client_name, i.paid_at::text
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.status = 'paid' AND i.paid_at IS NOT NULL
    ORDER BY i.paid_at DESC LIMIT 5
  `) as { id: string; amount_cents: string | number; client_name: string; paid_at: string }[]

  const company = firstRow(await sql`SELECT cash_in_bank_cents FROM company_settings LIMIT 1`)

  const projectCompletion = firstRow(await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled', 'archived'))::int AS in_progress,
      COUNT(*) FILTER (WHERE status = 'delayed')::int AS delayed
    FROM projects
  `)

  const recentFiles = (await sql`
    SELECT f.id::text, f.name, f."createdAt"::text
    FROM files f
    ORDER BY f."createdAt" DESC LIMIT 4
  `) as { id: string; name: string; createdAt: string }[]

  const notifications = (await sql`
    (SELECT 'payment' AS kind, COALESCE(c.company, c.name, 'Client') AS title,
            'Payment received' AS message, i.paid_at::text AS ts, '/invoices/' || i.id::text AS href
     FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
     WHERE i.status = 'paid' AND i.paid_at IS NOT NULL ORDER BY i.paid_at DESC LIMIT 2)
    UNION ALL
    (SELECT 'proposal', COALESCE(client_name, title, 'Client'), 'Proposal sent', sent_at::text, '/proposals/' || id::text
     FROM proposals WHERE status IN ('sent', 'viewed') ORDER BY sent_at DESC NULLS LAST LIMIT 2)
    UNION ALL
    (SELECT 'invoice', COALESCE(c.company, c.name), 'Invoice sent', i."createdAt"::text, '/invoices/' || i.id::text
     FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
     WHERE i.status = 'sent' ORDER BY i."createdAt" DESC LIMIT 2)
    ORDER BY ts DESC NULLS LAST LIMIT 5
  `) as { kind: string; title: string; message: string; ts: string; href: string }[]

  const calendarEvents = (await sql`
    SELECT m.id::text, m.title, p.name AS project_name,
           m.due_at::text AS starts_at
    FROM milestones m
    JOIN projects p ON p.id = m.project_id
    WHERE m.completed_at IS NULL
      AND m.due_at::date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '7 days'
    ORDER BY m.due_at ASC LIMIT 4
  `) as { id: string; title: string; project_name: string; starts_at: string }[]

  const weeklyGoalTarget = 20000000

  const outstandingCents = num(rowVal(revenueRow, 'outstanding_cents'))
  const followUpsDue = num(rowVal(snapshotRow, 'follow_ups_due'))
  const pendingInvoiceCount = num(rowVal(revenueRow, 'pending_invoice_count'))
  const proposalsAwaiting = num(
    rowVal(firstRow(await sql`SELECT COUNT(*)::int AS c FROM crm_leads WHERE status = 'proposal_sent'`), 'c'),
  )
  const projectsAtRisk = num(rowVal(projectHealth, 'at_risk')) + num(rowVal(projectHealth, 'delayed'))

  const aiAssistant = await buildAiAssistant({
    followUpsDue,
    outstandingCents,
    pendingInvoices: pendingInvoiceCount,
    overdueInvoices: num(rowVal(snapshotRow, 'overdue_invoices')),
    projectsAtRisk,
    proposalsAwaiting,
    revenueTodayCents: paidToday,
    revenueChangePct: todayChangePct,
    newLeadsToday: num(rowVal(snapshotRow, 'new_leads_today')),
    momPct,
    profitMonthCents: profitThisMonth,
    activeProjects: num(rowVal(snapshotRow, 'active_projects')),
    pipelineValueCents: pipelineValueCents,
  })

  return {
    revenue: {
      paid_all_time_cents: num(rowVal(revenueRow, 'paid_all_time_cents')),
      paid_today_cents: paidToday,
      paid_yesterday_cents: paidYesterday,
      paid_today_change_pct: todayChangePct,
      paid_this_month_cents: paidThisMonth,
      paid_last_month_cents: paidLastMonth,
      mom_change_pct: momPct,
      outstanding_cents: outstandingCents,
      expenses_this_month_cents: expensesThisMonth,
      profit_this_month_cents: profitThisMonth,
      sparkline: monthlyRows.map((m) => num(m.payments_received_cents)),
    },
    monthly_chart: monthlyRows.map((m) => {
      const collections = num(m.payments_received_cents) / 100
      const expenses = num(m.expenses_cents) / 100
      return {
        month: m.month_label,
        revenue: num(m.revenue_cents) / 100,
        payments_received: collections,
        collections,
        outstanding: num(m.outstanding_cents) / 100,
        expenses,
        profit: collections - expenses,
      }
    }),
    daily_chart: dailyRows.map((d) => {
      const collections = num(d.collections_cents) / 100
      const expenses = num(d.expenses_cents) / 100
      return {
        period: d.day_label,
        revenue: collections,
        collections,
        expenses,
        profit: collections - expenses,
      }
    }),
    today_snapshot: {
      revenue_today_cents: paidToday,
      revenue_today_change_pct: todayChangePct,
      collections_due_cents: outstandingCents,
      collections_due_count: pendingInvoiceCount,
      new_leads_today: num(rowVal(snapshotRow, 'new_leads_today')),
      qualified_leads: num(rowVal(snapshotRow, 'qualified_leads')),
      follow_ups_due: followUpsDue,
      meetings_today: num(rowVal(snapshotRow, 'meetings_today')),
      active_projects: num(rowVal(snapshotRow, 'active_projects')),
      projects_nearing_completion: num(rowVal(snapshotRow, 'projects_nearing_completion')),
      tasks_due_today: num(rowVal(snapshotRow, 'tasks_due_today')),
      overdue_invoices: num(rowVal(snapshotRow, 'overdue_invoices')),
      pending_invoices_cents: outstandingCents,
      pending_invoice_count: pendingInvoiceCount,
    },
    team_utilization_pct: teamUtilization,
    lead_funnel: leadFunnel,
    pipeline: {
      open_leads: openLeads,
      pipeline_value_cents: pipelineValueCents,
      booked_value_cents: bookedValueCents,
      weighted_pipeline_cents: weightedPipelineCents,
      opportunities_count: openLeads,
      expected_close_pct: expectedClosePct,
    },
    projects_summary: {
      active: num(rowVal(projectsSummary, 'active')),
      awaiting_client: num(rowVal(projectsSummary, 'awaiting_client')),
      testing: num(rowVal(projectsSummary, 'testing')),
      deploying: num(rowVal(projectsSummary, 'deploying')),
      average_health_pct: num(rowVal(projectsSummary, 'average_health_pct')),
    },
    project_health: {
      on_track: num(rowVal(projectHealth, 'on_track')),
      at_risk: num(rowVal(projectHealth, 'at_risk')),
      delayed: num(rowVal(projectHealth, 'delayed')),
      awaiting_client: num(rowVal(projectHealth, 'awaiting_client')),
    },
    client_health: clientHealth.map((c) => ({
      id: String(c.id),
      name: String(c.company || c.name),
      revenue_cents: num(c.revenue_cents),
      outstanding_cents: num(c.outstanding_cents),
      project_count: num(c.project_count),
      last_contact_at: c.last_contact_at ? String(c.last_contact_at) : null,
      health_pct: num(c.health_pct),
      project_status: String(c.project_status ?? 'none'),
      invoice_overdue: Boolean(c.invoice_overdue),
    })),
    activity,
    ai_assistant: aiAssistant,
    widgets: {
      revenue_forecast_cents:
        num(rowVal(forecastRow, 'invoiced_due_cents')) + weightedPipelineCents,
      pending_collections_this_week_cents: num(rowVal(collectionsWeekRow, 'cents')),
      pending_collections_this_week_count: num(rowVal(collectionsWeekRow, 'cnt')),
      cash_in_bank_cents: num(rowVal(company, 'cash_in_bank_cents')),
      monthly_profit: {
        revenue_cents: paidThisMonth,
        expenses_cents: expensesThisMonth,
        profit_cents: profitThisMonth,
      },
      upcoming_deadlines: upcomingDeadlines.map((d) => ({
        project_id: d.project_id,
        project_name: d.project_name,
        client_name: d.client_name,
        due_date: d.due_date,
      })),
      recent_payments: recentPayments.map((p) => ({
        id: p.id,
        amount_cents: num(p.amount_cents),
        client_name: p.client_name,
        paid_at: p.paid_at,
      })),
      team_workload: teamWorkload.map((m) => ({
        user_id: m.user_id,
        name: m.name.split('@')[0] ?? m.name,
        role: m.role,
        open_tasks: m.open_tasks,
        utilization_pct: Math.min(100, m.open_tasks * 15),
      })),
      cash_flow: monthlyRows.map((m) => {
        const inflow = num(m.payments_received_cents)
        const outflow = num(m.expenses_cents)
        return { month: m.month_label, inflow, outflow, net: inflow - outflow }
      }),
      weekly_goal: {
        target_cents: weeklyGoalTarget,
        current_cents: paidThisMonth,
        progress_pct: weeklyGoalTarget > 0 ? Math.min(100, Math.round((paidThisMonth / weeklyGoalTarget) * 100)) : 0,
      },
      project_completion: {
        completed: num(rowVal(projectCompletion, 'completed')),
        in_progress: num(rowVal(projectCompletion, 'in_progress')),
        delayed: num(rowVal(projectCompletion, 'delayed')),
      },
      recent_files: recentFiles.map((f) => ({ id: f.id, name: f.name, created_at: f.createdAt })),
      notifications: notifications.map((n) => ({
        kind: n.kind,
        title: n.title,
        message: n.message,
        created_at: n.ts,
        href: n.href,
      })),
      calendar_events: calendarEvents.map((e) => ({
        id: e.id,
        title: e.title,
        project_name: e.project_name,
        starts_at: e.starts_at,
      })),
    },
  }
}
