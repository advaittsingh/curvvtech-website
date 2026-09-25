import { firstRow, sql } from '../../../lib/sqlPool.js'
import { logProjectActivity } from './projectActivity.js'
import { getProjectFeed } from './projectFeed.js'

const DOC_FOLDER_KINDS = [
  { name: 'Contracts', kind: 'contracts' },
  { name: 'Designs', kind: 'designs' },
  { name: 'Assets', kind: 'assets' },
  { name: 'Source Code', kind: 'source' },
  { name: 'Deliverables', kind: 'deliverables' },
  { name: 'Recordings', kind: 'recordings' },
  { name: 'Meetings', kind: 'meetings' },
  { name: 'Invoices', kind: 'invoices' },
] as const

const TIMELINE_PHASES = [
  { key: 'requirements', label: 'Requirements' },
  { key: 'design', label: 'Design' },
  { key: 'frontend', label: 'Frontend' },
  { key: 'backend', label: 'Backend' },
  { key: 'testing', label: 'Testing' },
  { key: 'deployment', label: 'Deployment' },
  { key: 'completed', label: 'Completed' },
] as const

export async function getProjectFinance(projectId: string) {
  const project = firstRow<{ budget_cents?: number; gst_cents?: number; quoted_cents?: number }>(
    await sql`SELECT budget_cents, gst_cents, quoted_cents FROM projects WHERE id = ${projectId}::uuid`,
  )
  if (!project) return null

  const budgetCents = Number(project.budget_cents ?? 0)
  const gstCents = Number(project.gst_cents ?? 0)
  const quotedCents = Number(project.quoted_cents ?? budgetCents)

  const invoices = (await sql`
    SELECT id::text, invoice_number, status, total_cents, amount_cents, tax_cents, paid_at::text, "createdAt"::text
    FROM invoices WHERE project_id = ${projectId}::uuid ORDER BY "createdAt" ASC
  `) as { id: string; invoice_number?: string; status?: string; total_cents?: number; amount_cents?: number; tax_cents?: number; paid_at?: string; createdAt?: string }[]

  const paid = invoices.filter((i) => i.status === 'paid')
  const collectedCents = paid.reduce((s, i) => s + Number(i.total_cents ?? i.amount_cents ?? 0), 0)
  const pendingCents = Math.max(0, budgetCents - collectedCents)

  const expenseCents = await loadProjectExpenses(projectId)
  const profitCents = collectedCents - expenseCents
  const marginPct = collectedCents > 0 ? Math.round((profitCents / collectedCents) * 100) : 0
  const expectedCents = budgetCents + gstCents

  const cashflow = await loadCashflow(projectId)
  const expenseFlow = await loadExpenseFlow(projectId)

  const monthMap = new Map<string, { inflow: number; outflow: number }>()
  for (const c of cashflow) monthMap.set(c.month, { inflow: Number(c.inflow), outflow: monthMap.get(c.month)?.outflow ?? 0 })
  for (const e of expenseFlow) {
    const cur = monthMap.get(e.month) ?? { inflow: 0, outflow: 0 }
    monthMap.set(e.month, { ...cur, outflow: Number(e.outflow) })
  }

  return {
    revenue_cents: collectedCents,
    expenses_cents: expenseCents,
    profit_cents: profitCents,
    gst_cents: gstCents,
    pending_cents: pendingCents,
    expected_cents: expectedCents,
    budget_cents: budgetCents,
    quoted_cents: quotedCents,
    margin_pct: marginPct,
    collection_pct: budgetCents > 0 ? Math.round((collectedCents / budgetCents) * 100) : 0,
    cashflow: [...monthMap.entries()].map(([month, v]) => ({ month, inflow: v.inflow, outflow: v.outflow, net: v.inflow - v.outflow })),
    payment_history: paid.map((i) => ({
      id: i.id,
      invoice_number: i.invoice_number,
      amount_cents: Number(i.total_cents ?? i.amount_cents ?? 0),
      paid_at: i.paid_at,
    })),
    invoices: invoices.map((i) => ({
      id: i.id,
      invoice_number: i.invoice_number,
      status: i.status,
      total_cents: Number(i.total_cents ?? i.amount_cents ?? 0),
      paid_at: i.paid_at,
    })),
  }
}

export async function getProjectAnalytics(projectId: string) {
  const project = firstRow<{ progress_pct?: number; start_date?: string; createdAt?: string }>(
    await sql`SELECT progress_pct, start_date::text, "createdAt"::text FROM projects WHERE id = ${projectId}::uuid`,
  )
  if (!project) return null

  const tasks = (await sql`
    SELECT status, completed_at::text, "createdAt"::text FROM tasks WHERE project_id = ${projectId}::uuid
  `) as { status?: string; completed_at?: string; createdAt?: string }[]

  const total = tasks.length
  const done = tasks.filter((t) => t.status === 'done' || t.status === 'completed').length
  const completionPct = total > 0 ? Math.round((done / total) * 100) : Number(project.progress_pct ?? 0)

  const milestones = (await sql`
    SELECT title, completion_pct, completed_at::text, status FROM milestones WHERE project_id = ${projectId}::uuid
  `) as { title?: string; completion_pct?: number; completed_at?: string; status?: string }[]

  const msDone = milestones.filter((m) => m.completed_at).length
  const milestonePct = milestones.length > 0 ? Math.round((msDone / milestones.length) * 100) : completionPct

  const start = new Date(project.start_date ?? project.createdAt ?? Date.now())
  const weeks: { week: string; remaining: number; ideal: number }[] = []
  const totalWeeks = 8
  for (let w = 0; w <= totalWeeks; w++) {
    const ideal = Math.max(0, total - Math.round((total * w) / totalWeeks))
    const weekDate = new Date(start)
    weekDate.setDate(weekDate.getDate() + w * 7)
    const completedByWeek = tasks.filter((t) => t.completed_at && new Date(t.completed_at) <= weekDate).length
    weeks.push({
      week: `W${w + 1}`,
      remaining: Math.max(0, total - completedByWeek),
      ideal,
    })
  }

  const velocity: { week: string; completed: number }[] = []
  for (let w = 0; w < 6; w++) {
    const ws = new Date()
    ws.setDate(ws.getDate() - (5 - w) * 7)
    const we = new Date(ws)
    we.setDate(we.getDate() + 7)
    const count = tasks.filter((t) => {
      if (!t.completed_at) return false
      const d = new Date(t.completed_at)
      return d >= ws && d < we
    }).length
    velocity.push({ week: `W${w + 1}`, completed: count })
  }

  const revenueTrend = await loadRevenueTrend(projectId)
  const profitTrend = await loadProfitTrend(projectId)

  const hoursRow = await loadResourceHours(projectId)

  return {
    completion_pct: completionPct,
    milestone_pct: milestonePct,
    tasks_total: total,
    tasks_done: done,
    burndown: weeks,
    velocity,
    milestone_progress: milestones.map((m) => ({
      title: m.title,
      pct: m.completion_pct ?? (m.completed_at ? 100 : 0),
      status: m.status ?? (m.completed_at ? 'completed' : 'pending'),
    })),
    revenue_trend: revenueTrend.map((r) => ({ period: r.period, revenue: Number(r.revenue) })),
    profit_trend: profitTrend.map((r) => ({ period: r.period, profit: Number(r.profit ?? 0) })),
    time_spent_hours: Number(hoursRow?.act ?? 0),
    time_estimated_hours: Number(hoursRow?.est ?? 0),
  }
}

export async function getProjectRichTimeline(projectId: string) {
  const project = firstRow<{ progress_pct?: number; status?: string }>(
    await sql`SELECT progress_pct, status FROM projects WHERE id = ${projectId}::uuid`,
  )
  if (!project) return null

  // Derive phase status live from progress so the timeline advances as
  // milestones complete, instead of freezing on stale stored phases.
  const progress = String(project.status ?? '') === 'completed' ? 100 : Number(project.progress_pct ?? 0)

  const span = 100 / TIMELINE_PHASES.length
  const mapped = TIMELINE_PHASES.map((tp, i) => {
    const prevThreshold = Math.round(i * span)
    const threshold = Math.round((i + 1) * span)
    let status: 'done' | 'in_progress' | 'pending' = 'pending'
    let phaseProgress = 0
    if (progress >= threshold) {
      status = 'done'
      phaseProgress = 100
    } else if (progress > prevThreshold) {
      status = 'in_progress'
      phaseProgress = Math.max(5, Math.round(((progress - prevThreshold) / (threshold - prevThreshold)) * 100))
    }
    return { key: tp.key, label: tp.label, status, progress: phaseProgress }
  })

  const phaseKeys = TIMELINE_PHASES.map((p) => p.key)

  const feed = await loadTimelineFeed(projectId)

  const eventsByPhase = (phaseKey: string) => {
    const keywords: Record<string, RegExp> = {
      requirements: /requirement|scope|kickoff|created|import/i,
      design: /design|figma|mockup|wireframe/i,
      frontend: /frontend|ui|homepage|landing/i,
      backend: /backend|api|database|payment/i,
      testing: /test|qa|bug|fix/i,
      deployment: /deploy|staging|production|launch|live/i,
      completed: /completed|handover|deliver|paid|milestone completed/i,
    }
    const re = keywords[phaseKey] ?? /.*/
    return feed.filter((e) => re.test(`${e.title} ${e.description ?? ''} ${e.event_type}`)).slice(0, 8)
  }

  return {
    phases: mapped,
    phase_events: Object.fromEntries(phaseKeys.map((k) => [k, eventsByPhase(k)])),
    all_events: feed.slice(0, 40),
  }
}

export async function bootstrapProjectFolders(projectId: string, actorId?: string) {
  const created = []
  for (const f of DOC_FOLDER_KINDS) {
    const existing = firstRow(
      await sql`
        SELECT id FROM file_folders
        WHERE project_id = ${projectId}::uuid AND folder_kind = ${f.kind}
        LIMIT 1
      `,
    )
    if (existing) continue
    const row = firstRow(
      await sql`
        INSERT INTO file_folders (name, project_id, folder_kind, created_by_user_id, "createdAt")
        VALUES (${f.name}, ${projectId}::uuid, ${f.kind}, ${actorId ?? null}, NOW())
        RETURNING *
      `,
    )
    if (row) created.push(row)
  }
  return created
}

export async function listProjectFolders(projectId: string) {
  await bootstrapProjectFolders(projectId)
  return sql`
    SELECT ff.*, (SELECT COUNT(*)::int FROM files f WHERE f.folder_id = ff.id) AS file_count
    FROM file_folders ff
    WHERE ff.project_id = ${projectId}::uuid
    ORDER BY ff.name ASC
  `
}

// ─── Revisions CRUD ───
export async function listRevisions(projectId: string) {
  return sql`SELECT * FROM project_revisions WHERE project_id = ${projectId}::uuid ORDER BY revision_number DESC`
}

export async function createRevision(projectId: string, body: Record<string, unknown>, actorId?: string) {
  const maxRow = firstRow<{ n?: number }>(
    await sql`SELECT COALESCE(MAX(revision_number), 0)::int AS n FROM project_revisions WHERE project_id = ${projectId}::uuid`,
  )
  const num = Number(maxRow?.n ?? 0) + 1
  const row = firstRow(
    await sql`
      INSERT INTO project_revisions (project_id, revision_number, requested_by, description, status, files_json, hours_spent, completed_by)
      VALUES (
        ${projectId}::uuid, ${num},
        ${String(body.requested_by ?? '')},
        ${String(body.description ?? '')},
        ${String(body.status ?? 'pending')},
        ${JSON.stringify(body.files_json ?? [])}::jsonb,
        ${body.hours_spent ?? null},
        ${body.completed_by ?? null}
      ) RETURNING *
    `,
  )
  await logProjectActivity(projectId, 'revision_created', `Revision #${num} logged`, String(body.description ?? '').slice(0, 80), actorId)
  return row
}

export async function updateRevision(projectId: string, rid: string, body: Record<string, unknown>) {
  await sql`
    UPDATE project_revisions SET
      requested_by = COALESCE(${body.requested_by ?? null}, requested_by),
      description = COALESCE(${body.description ?? null}, description),
      status = COALESCE(${body.status ?? null}, status),
      files_json = COALESCE(${body.files_json !== undefined ? JSON.stringify(body.files_json) : null}::jsonb, files_json),
      hours_spent = COALESCE(${body.hours_spent !== undefined ? body.hours_spent : null}, hours_spent),
      completed_by = COALESCE(${body.completed_by ?? null}, completed_by),
      approved = COALESCE(${body.approved !== undefined ? body.approved : null}, approved),
      approved_at = CASE WHEN ${body.approved === true} THEN NOW() ELSE approved_at END,
      "updatedAt" = NOW()
    WHERE id = ${rid}::uuid AND project_id = ${projectId}::uuid
  `
  return firstRow(await sql`SELECT * FROM project_revisions WHERE id = ${rid}::uuid`)
}

export async function deleteRevision(projectId: string, rid: string) {
  await sql`DELETE FROM project_revisions WHERE id = ${rid}::uuid AND project_id = ${projectId}::uuid`
}

// ─── Change orders ───
export async function listChangeOrders(projectId: string) {
  return sql`SELECT * FROM project_change_orders WHERE project_id = ${projectId}::uuid ORDER BY "createdAt" DESC`
}

export async function createChangeOrder(projectId: string, body: Record<string, unknown>, actorId?: string) {
  const row = firstRow(
    await sql`
      INSERT INTO project_change_orders (project_id, title, description, estimated_hours, cost_cents, status, approval_status)
      VALUES (
        ${projectId}::uuid,
        ${String(body.title ?? '')},
        ${String(body.description ?? '')},
        ${body.estimated_hours ?? null},
        ${Number(body.cost_cents ?? 0)},
        ${String(body.status ?? 'draft')},
        ${String(body.approval_status ?? 'pending')}
      ) RETURNING *
    `,
  )
  await logProjectActivity(projectId, 'change_order', `Change order: ${body.title ?? 'New'}`, null, actorId)
  return row
}

export async function updateChangeOrder(projectId: string, cid: string, body: Record<string, unknown>) {
  await sql`
    UPDATE project_change_orders SET
      title = COALESCE(${body.title ?? null}, title),
      description = COALESCE(${body.description ?? null}, description),
      estimated_hours = COALESCE(${body.estimated_hours !== undefined ? body.estimated_hours : null}, estimated_hours),
      cost_cents = COALESCE(${body.cost_cents !== undefined ? body.cost_cents : null}, cost_cents),
      status = COALESCE(${body.status ?? null}, status),
      approval_status = COALESCE(${body.approval_status ?? null}, approval_status),
      payment_status = COALESCE(${body.payment_status ?? null}, payment_status),
      invoice_id = COALESCE(${body.invoice_id ?? null}, invoice_id),
      "updatedAt" = NOW()
    WHERE id = ${cid}::uuid AND project_id = ${projectId}::uuid
  `
  return firstRow(await sql`SELECT * FROM project_change_orders WHERE id = ${cid}::uuid`)
}

// ─── Scope ───
export async function listScopeItems(projectId: string) {
  return sql`SELECT * FROM project_scope_items WHERE project_id = ${projectId}::uuid ORDER BY category, sort_order, "createdAt"`
}

export async function createScopeItem(projectId: string, body: Record<string, unknown>) {
  return firstRow(
    await sql`
      INSERT INTO project_scope_items (project_id, category, title, description, cost_cents, sort_order)
      VALUES (
        ${projectId}::uuid,
        ${String(body.category ?? 'included')},
        ${String(body.title ?? '')},
        ${body.description ?? null},
        ${Number(body.cost_cents ?? 0)},
        ${Number(body.sort_order ?? 0)}
      ) RETURNING *
    `,
  )
}

export async function updateScopeItem(projectId: string, sid: string, body: Record<string, unknown>) {
  await sql`
    UPDATE project_scope_items SET
      category = COALESCE(${body.category ?? null}, category),
      title = COALESCE(${body.title ?? null}, title),
      description = COALESCE(${body.description !== undefined ? body.description : null}, description),
      cost_cents = COALESCE(${body.cost_cents !== undefined ? body.cost_cents : null}, cost_cents),
      sort_order = COALESCE(${body.sort_order !== undefined ? body.sort_order : null}, sort_order)
    WHERE id = ${sid}::uuid AND project_id = ${projectId}::uuid
  `
  return firstRow(await sql`SELECT * FROM project_scope_items WHERE id = ${sid}::uuid`)
}

export async function deleteScopeItem(projectId: string, sid: string) {
  await sql`DELETE FROM project_scope_items WHERE id = ${sid}::uuid AND project_id = ${projectId}::uuid`
}

// ─── Resources ───
export async function listResources(projectId: string) {
  const rows = await sql`
    SELECT ra.*, u.email,
      (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = ra.project_id AND t.assignee_user_id = u.id::text AND t.status NOT IN ('done', 'completed')) AS open_tasks
    FROM project_resource_allocations ra
    JOIN users u ON u.id = ra.user_id
    WHERE ra.project_id = ${projectId}::uuid
  `
  return rows
}

export async function upsertResource(projectId: string, body: Record<string, unknown>) {
  return firstRow(
    await sql`
      INSERT INTO project_resource_allocations (project_id, user_id, role, allocation_pct, estimated_hours, actual_hours, weekly_capacity_hours, efficiency_pct)
      VALUES (
        ${projectId}::uuid,
        ${body.user_id}::uuid,
        ${String(body.role ?? 'member')},
        ${Number(body.allocation_pct ?? 100)},
        ${Number(body.estimated_hours ?? 0)},
        ${Number(body.actual_hours ?? 0)},
        ${Number(body.weekly_capacity_hours ?? 40)},
        ${Number(body.efficiency_pct ?? 100)}
      )
      ON CONFLICT (project_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        allocation_pct = EXCLUDED.allocation_pct,
        estimated_hours = EXCLUDED.estimated_hours,
        actual_hours = EXCLUDED.actual_hours,
        weekly_capacity_hours = EXCLUDED.weekly_capacity_hours,
        efficiency_pct = EXCLUDED.efficiency_pct,
        "updatedAt" = NOW()
      RETURNING *
    `,
  )
}

export async function deleteResource(projectId: string, rid: string) {
  await sql`DELETE FROM project_resource_allocations WHERE id = ${rid}::uuid AND project_id = ${projectId}::uuid`
}

// ─── Deployment ───
export async function getDeployment(projectId: string) {
  let row = firstRow(await sql`SELECT * FROM project_deployments WHERE project_id = ${projectId}::uuid`)
  if (!row) {
    const p = firstRow<{ live_url?: string; repository_url?: string }>(
      await sql`SELECT live_url, repository_url FROM projects WHERE id = ${projectId}::uuid`,
    )
    row = firstRow(
      await sql`
        INSERT INTO project_deployments (project_id, production_url, github_repo)
        VALUES (${projectId}::uuid, ${p?.live_url ?? null}, ${p?.repository_url ?? null})
        RETURNING *
      `,
    )
  }
  const history = await sql`
    SELECT * FROM project_deployment_history WHERE project_id = ${projectId}::uuid ORDER BY deployed_at DESC LIMIT 20
  `
  return { config: row, history }
}

export async function updateDeployment(projectId: string, body: Record<string, unknown>) {
  await getDeployment(projectId)
  return firstRow(
    await sql`
      UPDATE project_deployments SET
        hosting = COALESCE(${body.hosting ?? null}, hosting),
        server = COALESCE(${body.server ?? null}, server),
        domain = COALESCE(${body.domain ?? null}, domain),
        github_repo = COALESCE(${body.github_repo ?? null}, github_repo),
        github_branch = COALESCE(${body.github_branch ?? null}, github_branch),
        production_url = COALESCE(${body.production_url ?? null}, production_url),
        staging_url = COALESCE(${body.staging_url ?? null}, staging_url),
        ssl_status = COALESCE(${body.ssl_status ?? null}, ssl_status),
        cron_jobs = COALESCE(${body.cron_jobs !== undefined ? JSON.stringify(body.cron_jobs) : null}::jsonb, cron_jobs),
        database_info = COALESCE(${body.database_info ?? null}, database_info),
        api_keys_json = COALESCE(${body.api_keys_json !== undefined ? JSON.stringify(body.api_keys_json) : null}::jsonb, api_keys_json),
        env_notes = COALESCE(${body.env_notes ?? null}, env_notes),
        "updatedAt" = NOW()
      WHERE project_id = ${projectId}::uuid
      RETURNING *
    `,
  )
}

export async function recordDeployment(projectId: string, body: Record<string, unknown>, actorId?: string) {
  const env = String(body.environment ?? 'production')
  const row = firstRow(
    await sql`
      INSERT INTO project_deployment_history (project_id, environment, version, deployed_by, status, notes)
      VALUES (
        ${projectId}::uuid, ${env},
        ${body.version ?? null},
        ${actorId ?? body.deployed_by ?? null},
        ${String(body.status ?? 'success')},
        ${body.notes ?? null}
      ) RETURNING *
    `,
  )
  await sql`
    UPDATE project_deployments SET last_deployed_at = NOW(), last_deployed_by = ${actorId ?? null}, "updatedAt" = NOW()
    WHERE project_id = ${projectId}::uuid
  `
  await logProjectActivity(projectId, 'deployment', `Deployed to ${env}`, String(body.version ?? ''), actorId)
  return row
}

export async function rollbackDeployment(projectId: string, historyId: string, actorId?: string) {
  const prev = firstRow<{ environment?: string; version?: string }>(
    await sql`SELECT environment, version FROM project_deployment_history WHERE id = ${historyId}::uuid AND project_id = ${projectId}::uuid`,
  )
  if (!prev) return null
  return recordDeployment(
    projectId,
    { environment: prev.environment, version: prev.version, status: 'rolled_back', notes: `Rollback to ${prev.version}` },
    actorId,
  )
}

async function loadProjectExpenses(projectId: string): Promise<number> {
  try {
    const expenseRow = firstRow<{ total?: string }>(
      await sql`SELECT COALESCE(SUM(amount_cents), 0)::text AS total FROM expenses WHERE project_id = ${projectId}::uuid`,
    )
    return Number(expenseRow?.total ?? 0)
  } catch {
    return 0
  }
}

async function loadCashflow(projectId: string) {
  try {
    return (await sql`
      SELECT to_char(date_trunc('month', COALESCE(paid_at, "createdAt")), 'Mon YYYY') AS month,
             SUM(COALESCE(total_cents, amount_cents, 0))::bigint AS inflow
      FROM invoices
      WHERE project_id = ${projectId}::uuid AND status = 'paid'
      GROUP BY 1 ORDER BY MIN(COALESCE(paid_at, "createdAt"))
    `) as { month: string; inflow: string }[]
  } catch {
    return []
  }
}

async function loadExpenseFlow(projectId: string) {
  try {
    return (await sql`
      SELECT to_char(date_trunc('month', expense_date), 'Mon YYYY') AS month,
             SUM(amount_cents)::bigint AS outflow
      FROM expenses WHERE project_id = ${projectId}::uuid
      GROUP BY 1 ORDER BY MIN(expense_date)
    `) as { month: string; outflow: string }[]
  } catch {
    return []
  }
}

async function loadRevenueTrend(projectId: string) {
  try {
    return (await sql`
      SELECT to_char(COALESCE(paid_at, "createdAt"), 'YYYY-MM') AS period,
             SUM(COALESCE(total_cents, amount_cents, 0))::bigint AS revenue
      FROM invoices WHERE project_id = ${projectId}::uuid AND status = 'paid'
      GROUP BY 1 ORDER BY 1
    `) as { period: string; revenue: string }[]
  } catch {
    return []
  }
}

async function loadProfitTrend(projectId: string) {
  try {
    return (await sql`
      SELECT period, revenue - COALESCE(expenses, 0) AS profit FROM (
        SELECT to_char(COALESCE(i.paid_at, i."createdAt"), 'YYYY-MM') AS period,
               SUM(COALESCE(i.total_cents, i.amount_cents, 0))::bigint AS revenue
        FROM invoices i WHERE i.project_id = ${projectId}::uuid AND i.status = 'paid'
        GROUP BY 1
      ) r
      LEFT JOIN (
        SELECT to_char(expense_date, 'YYYY-MM') AS period, SUM(amount_cents)::bigint AS expenses
        FROM expenses WHERE project_id = ${projectId}::uuid GROUP BY 1
      ) e USING (period)
      ORDER BY period
    `) as { period: string; profit: string }[]
  } catch {
    return []
  }
}

async function loadResourceHours(projectId: string) {
  try {
    return firstRow<{ est?: string; act?: string }>(
      await sql`
        SELECT COALESCE(SUM(estimated_hours), 0)::text AS est,
               COALESCE(SUM(actual_hours), 0)::text AS act
        FROM project_resource_allocations WHERE project_id = ${projectId}::uuid
      `,
    )
  } catch {
    return null
  }
}

async function loadTimelineFeed(projectId: string) {
  try {
    return await getProjectFeed(projectId)
  } catch {
    return []
  }
}

// ─── Deliverable website URLs (client portal) ───
export type DeliverableUrlRow = {
  id: string
  project_id: string
  label: string
  url: string
  sort_order: number
  visibility: string
  createdAt?: string
  updatedAt?: string
}

function normalizeUrl(raw: string): string {
  const v = raw.trim()
  if (!v) throw new Error('URL is required')
  if (!/^https?:\/\//i.test(v)) return `https://${v}`
  return v
}

export async function listDeliverableUrls(projectId: string): Promise<DeliverableUrlRow[]> {
  return (await sql`
    SELECT id, project_id, label, url, sort_order, visibility, "createdAt", "updatedAt"
    FROM project_deliverable_urls
    WHERE project_id = ${projectId}::uuid
    ORDER BY sort_order ASC, "createdAt" ASC
  `) as DeliverableUrlRow[]
}

export async function createDeliverableUrl(
  projectId: string,
  body: { label?: string; url?: string; visibility?: string },
): Promise<DeliverableUrlRow> {
  const label = String(body.label ?? 'Website').trim() || 'Website'
  const url = normalizeUrl(String(body.url ?? ''))
  const visibility = body.visibility === 'internal' ? 'internal' : 'client'
  const sort = firstRow<{ n: number }>(
    await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM project_deliverable_urls WHERE project_id = ${projectId}::uuid`,
  )
  const row = firstRow<DeliverableUrlRow>(
    await sql`
      INSERT INTO project_deliverable_urls (project_id, label, url, sort_order, visibility)
      VALUES (${projectId}::uuid, ${label}, ${url}, ${sort?.n ?? 0}, ${visibility})
      RETURNING id, project_id, label, url, sort_order, visibility, "createdAt", "updatedAt"
    `,
  )
  if (!row) throw new Error('Failed to create URL')
  // Keep projects.live_url in sync with the first client-visible website URL.
  if (visibility === 'client') {
    const primary = firstRow<{ url: string }>(
      await sql`
        SELECT url FROM project_deliverable_urls
        WHERE project_id = ${projectId}::uuid AND visibility = 'client'
        ORDER BY sort_order ASC, "createdAt" ASC LIMIT 1
      `,
    )
    if (primary?.url) {
      await sql`UPDATE projects SET live_url = ${primary.url}, "updatedAt" = NOW() WHERE id = ${projectId}::uuid`
    }
  }
  await logProjectActivity(projectId, 'deliverable_url_added', `Website URL added: ${label}`, url)
  return row
}

export async function updateDeliverableUrl(
  projectId: string,
  urlId: string,
  body: { label?: string; url?: string; visibility?: string; sort_order?: number },
): Promise<DeliverableUrlRow | null> {
  const existing = firstRow<DeliverableUrlRow>(
    await sql`SELECT * FROM project_deliverable_urls WHERE id = ${urlId}::uuid AND project_id = ${projectId}::uuid`,
  )
  if (!existing) return null
  const label = body.label !== undefined ? (String(body.label).trim() || 'Website') : existing.label
  const url = body.url !== undefined ? normalizeUrl(String(body.url)) : existing.url
  const visibility =
    body.visibility !== undefined ? (body.visibility === 'internal' ? 'internal' : 'client') : existing.visibility
  const sort_order = body.sort_order !== undefined ? Number(body.sort_order) : existing.sort_order
  const row = firstRow<DeliverableUrlRow>(
    await sql`
      UPDATE project_deliverable_urls SET
        label = ${label},
        url = ${url},
        visibility = ${visibility},
        sort_order = ${sort_order},
        "updatedAt" = NOW()
      WHERE id = ${urlId}::uuid AND project_id = ${projectId}::uuid
      RETURNING id, project_id, label, url, sort_order, visibility, "createdAt", "updatedAt"
    `,
  )
  if (row && visibility === 'client') {
    const primary = firstRow<{ url: string }>(
      await sql`
        SELECT url FROM project_deliverable_urls
        WHERE project_id = ${projectId}::uuid AND visibility = 'client'
        ORDER BY sort_order ASC, "createdAt" ASC LIMIT 1
      `,
    )
    await sql`UPDATE projects SET live_url = ${primary?.url ?? null}, "updatedAt" = NOW() WHERE id = ${projectId}::uuid`
  }
  return row
}

export async function deleteDeliverableUrl(projectId: string, urlId: string): Promise<boolean> {
  const row = firstRow<{ id: string }>(
    await sql`DELETE FROM project_deliverable_urls WHERE id = ${urlId}::uuid AND project_id = ${projectId}::uuid RETURNING id`,
  )
  if (!row) return false
  const primary = firstRow<{ url: string }>(
    await sql`
      SELECT url FROM project_deliverable_urls
      WHERE project_id = ${projectId}::uuid AND visibility = 'client'
      ORDER BY sort_order ASC, "createdAt" ASC LIMIT 1
    `,
  )
  await sql`UPDATE projects SET live_url = ${primary?.url ?? null}, "updatedAt" = NOW() WHERE id = ${projectId}::uuid`
  return true
}

/** Client-portal deliverable URLs for all projects owned by a client. */
export async function listClientDeliverableUrls(clientId: string, organizationId: string) {
  return (await sql`
    SELECT u.id, u.label, u.url, u.project_id, p.name AS project_name
    FROM project_deliverable_urls u
    JOIN projects p ON p.id = u.project_id
    WHERE p.client_id = ${clientId}
      AND p.organization_id = ${organizationId}
      AND u.visibility = 'client'
      AND COALESCE(p.is_internal, false) = false
      AND p.archived_at IS NULL
    ORDER BY p."updatedAt" DESC, u.sort_order ASC, u."createdAt" ASC
  `) as Array<{ id: string; label: string; url: string; project_id: string; project_name: string }>
}

/** Website / app URLs published for a single project (client portal). */
export async function listProjectDeliverableUrlsForClient(
  clientId: string,
  organizationId: string,
  projectId: string,
) {
  const rows = (await sql`
    SELECT u.id, u.label, u.url
    FROM project_deliverable_urls u
    JOIN projects p ON p.id = u.project_id
    WHERE p.id = ${projectId}::uuid
      AND p.client_id = ${clientId}
      AND p.organization_id = ${organizationId}
      AND u.visibility = 'client'
    ORDER BY u.sort_order ASC, u."createdAt" ASC
  `) as Array<{ id: string; label: string; url: string }>;
  if (rows.length > 0) return rows;
  const legacy = firstRow<{ live_url: string | null }>(
    await sql`
      SELECT live_url FROM projects
      WHERE id = ${projectId}::uuid AND client_id = ${clientId} AND organization_id = ${organizationId}
        AND live_url IS NOT NULL AND trim(live_url) <> ''
    `,
  );
  if (legacy?.live_url) {
    return [{ id: `live-${projectId}`, label: "Live website", url: legacy.live_url }];
  }
  return [];
}
