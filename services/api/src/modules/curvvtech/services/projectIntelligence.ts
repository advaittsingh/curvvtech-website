import OpenAI from 'openai'
import { firstRow, sql } from '../../../lib/sqlPool.js'
import { logProjectActivity } from './projectActivity.js'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'

export type DeliveryPhase = {
  key: string
  label: string
  status: 'done' | 'in_progress' | 'pending'
  progress?: number
}

export type ProjectIntelligence = {
  project_health?: string
  timeline_risk?: string
  budget_risk?: string
  current_bottleneck?: string
  recommended_action?: string
  predicted_completion?: string
  ai_summary?: string
  current_phase?: string
  project_type?: string
  confidence_percent?: number
  delivery_phases?: DeliveryPhase[]
  risks?: string[]
}

const DEFAULT_PHASES: DeliveryPhase[] = [
  { key: 'requirements', label: 'Requirements', status: 'pending', progress: 0 },
  { key: 'design', label: 'Design', status: 'pending', progress: 0 },
  { key: 'development', label: 'Development', status: 'pending', progress: 0 },
  { key: 'testing', label: 'Testing', status: 'pending', progress: 0 },
  { key: 'launch', label: 'Launch', status: 'pending', progress: 0 },
]

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw.replace(/^```json\n?|\n?```$/g, '').trim()) as T
  } catch {
    return null
  }
}

export function buildPhasesFromProgress(progressPct: number): DeliveryPhase[] {
  const thresholds = [15, 35, 70, 90, 100]
  return DEFAULT_PHASES.map((phase, i) => {
    const prev = i === 0 ? 0 : thresholds[i - 1]!
    const cap = thresholds[i]!
    if (progressPct >= cap) return { ...phase, status: 'done' as const, progress: 100 }
    if (progressPct >= prev) {
      const pct = cap > prev ? Math.round(((progressPct - prev) / (cap - prev)) * 100) : 0
      return { ...phase, status: 'in_progress' as const, progress: Math.max(5, pct) }
    }
    return { ...phase, status: 'pending' as const, progress: 0 }
  })
}

function inferProjectType(name: string, notes?: string | null): string {
  const text = `${name} ${notes ?? ''}`.toLowerCase()
  if (text.includes('shopify') || text.includes('ecommerce') || text.includes('e-commerce')) return 'Shopify Website'
  if (text.includes('mobile') || text.includes('app')) return 'Mobile App'
  if (text.includes('crm')) return 'CRM Platform'
  if (text.includes('admin')) return 'Admin Panel'
  return 'Custom Software'
}

export function buildPreviewIntel(row: {
  name: string
  status?: string
  progress_pct?: number
  internal_notes?: string | null
  project_type?: string | null
  target_end_date?: string | null
}): ProjectIntelligence {
  const progress = Number(row.progress_pct ?? 0)
  const phases = buildPhasesFromProgress(progress)
  const current = phases.find((p) => p.status === 'in_progress') ?? phases.find((p) => p.status === 'pending')
  const end = row.target_end_date ? new Date(row.target_end_date) : new Date(Date.now() + 18 * 86400000)
  return {
    project_health: progress >= 50 ? 'Good' : progress >= 20 ? 'Fair' : 'Early stage',
    timeline_risk: progress >= 30 ? 'Low' : 'Medium',
    budget_risk: 'Low',
    current_bottleneck: current?.label ? `${current.label} in progress` : 'Kickoff and requirements gathering',
    recommended_action: 'Schedule a client sync to confirm next milestone deliverables.',
    predicted_completion: end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    ai_summary: `${row.name} is in ${row.status ?? 'planning'} with ${progress}% overall progress. Focus on ${current?.label?.toLowerCase() ?? 'requirements'} before moving to the next delivery phase.`,
    current_phase: current?.key ?? 'requirements',
    project_type: row.project_type ?? inferProjectType(row.name, row.internal_notes),
    confidence_percent: 72,
    delivery_phases: phases,
  }
}

type MilestoneRow = { title?: string; due_at?: string | null; completed_at?: string | null }
type InvoiceRow = { invoice_number?: string; status?: string; total_cents?: number; due_at?: string; paid_at?: string }

async function loadProjectContext(projectId: string) {
  const project = firstRow<Record<string, unknown>>(
    await sql`
      SELECT p.*, c.name AS client_name, c.email AS client_email,
             c.portal_status, c.portal_last_login_at::text AS portal_last_login_at,
             c.portal_invite_token
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      WHERE p.id = ${projectId}::uuid
    `,
  )
  if (!project) return null

  const milestones = (await sql`
    SELECT title, due_at::text, completed_at::text FROM milestones
    WHERE project_id = ${projectId}::uuid ORDER BY due_at ASC NULLS LAST
  `) as MilestoneRow[]
  const tasks = await sql`
    SELECT title, status, priority FROM tasks WHERE project_id = ${projectId}::uuid LIMIT 30
  `
  const invoices = (await sql`
    SELECT invoice_number, status, total_cents, due_at::text, paid_at::text
    FROM invoices WHERE project_id = ${projectId}::uuid ORDER BY "createdAt" DESC LIMIT 10
  `) as InvoiceRow[]
  const members = await sql`
    SELECT u.email, pm.role FROM project_members pm
    JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ${projectId}::uuid
  `
  return { project, milestones, tasks, invoices, members }
}

export async function getProjectSummary(projectId: string) {
  const ctx = await loadProjectContext(projectId)
  if (!ctx) return null

  const { project, milestones, invoices } = ctx
  const budgetCents = Number(project.budget_cents ?? 0)
  const paidRows = invoices.filter((i) => i.status === 'paid')
  const collectedCents = paidRows.reduce((s, i) => s + Number(i.total_cents ?? 0), 0)
  const pendingCents = Math.max(0, budgetCents - collectedCents)
  const collectionPct = budgetCents > 0 ? Math.round((collectedCents / budgetCents) * 100) : 0

  const openMs = milestones.filter((m) => !m.completed_at)
  const nextMilestone = openMs[0] as { title?: string; due_at?: string } | undefined

  const start = project.start_date ? new Date(String(project.start_date)) : new Date(String(project.createdAt))
  const end = project.target_end_date ? new Date(String(project.target_end_date)) : null
  const now = new Date()
  const dayElapsed = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / 86400000))
  const totalDays = end ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000)) : 21
  const daysUntilEnd = end ? Math.ceil((end.getTime() - now.getTime()) / 86400000) : null

  const manager = firstRow<{ email?: string; user_id?: string }>(
    await sql`
      SELECT u.email, u.id::text AS user_id FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ${projectId}::uuid AND pm.role IN ('manager', 'project_manager', 'lead')
      LIMIT 1
    `,
  )

  const portalBase = process.env.CLIENT_PORTAL_URL ?? 'https://client.curvvtech.com'
  const token = project.portal_invite_token as string | null
  const portalUrl = token ? `${portalBase}/portal?token=${token}` : null

  let intel = project.ai_intelligence as ProjectIntelligence | null
  if (typeof intel === 'string') {
    try {
      intel = JSON.parse(intel)
    } catch {
      intel = null
    }
  }
  if (!intel?.ai_summary) {
    intel = { ...buildPreviewIntel(project as never), ...intel }
  }

  const phases =
    (Array.isArray(project.delivery_phases) && (project.delivery_phases as DeliveryPhase[]).length > 0
      ? project.delivery_phases
      : intel?.delivery_phases) ?? buildPhasesFromProgress(Number(project.progress_pct ?? 0))

  return {
    budget_cents: budgetCents,
    collected_cents: collectedCents,
    pending_cents: pendingCents,
    collection_pct: collectionPct,
    next_milestone: nextMilestone?.title ?? null,
    next_milestone_due_at: nextMilestone?.due_at ?? null,
    days_elapsed: dayElapsed,
    total_days: totalDays,
    days_until_end: daysUntilEnd,
    manager_email: manager?.email ?? null,
    manager_user_id: manager?.user_id ?? null,
    portal: {
      status: project.portal_status ?? 'inactive',
      url: portalUrl,
      last_login_at: project.portal_last_login_at ?? null,
      access_enabled: ['active', 'invited'].includes(String(project.portal_status ?? '')),
    },
    intelligence: intel,
    delivery_phases: phases,
    invoice_count: invoices.length,
    task_count: ctx.tasks.length,
    open_milestones: openMs.length,
  }
}

export async function analyzeProject(projectId: string, actorUserId?: string): Promise<Record<string, unknown> | null> {
  const ctx = await loadProjectContext(projectId)
  if (!ctx) return null

  const { project, milestones, tasks, invoices, members } = ctx
  const preview = buildPreviewIntel(project as never)
  let intel: ProjectIntelligence = preview

  if (openai) {
    const prompt = JSON.stringify({
      project: {
        name: project.name,
        status: project.status,
        progress_pct: project.progress_pct,
        budget_cents: project.budget_cents,
        start_date: project.start_date,
        target_end_date: project.target_end_date,
        internal_notes: project.internal_notes,
      },
      milestones,
      tasks,
      invoices,
      members,
    })
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a senior agency project manager. Return ONLY valid JSON:
{
  "project_health": "Good|Fair|At Risk|Critical",
  "timeline_risk": "Low|Medium|High",
  "budget_risk": "Low|Medium|High",
  "current_bottleneck": "string",
  "recommended_action": "string",
  "predicted_completion": "e.g. June 29",
  "ai_summary": "2-3 sentence narrative for agency team",
  "current_phase": "requirements|design|development|testing|launch",
  "project_type": "string",
  "confidence_percent": 0-100,
  "delivery_phases": [{"key":"requirements","label":"Requirements","status":"done|in_progress|pending","progress":0-100}, ...],
  "risks": ["string"]
}`,
          },
          { role: 'user', content: prompt.slice(0, 8000) },
        ],
        max_tokens: 1200,
        temperature: 0.5,
        response_format: { type: 'json_object' },
      })
      const parsed = parseJson<ProjectIntelligence>(res.choices[0]?.message?.content ?? '')
      if (parsed) intel = { ...preview, ...parsed, delivery_phases: parsed.delivery_phases ?? preview.delivery_phases }
    } catch {
      /* heuristic fallback */
    }
  }

  await sql`
    UPDATE projects SET
      ai_intelligence = ${JSON.stringify(intel)}::jsonb,
      delivery_phases = ${JSON.stringify(intel.delivery_phases ?? [])}::jsonb,
      current_phase = ${intel.current_phase ?? 'requirements'},
      project_type = COALESCE(${intel.project_type ?? null}, project_type),
      analyzed_at = NOW(),
      "updatedAt" = NOW()
    WHERE id = ${projectId}::uuid
  `
  await logProjectActivity(projectId, 'ai_analyzed', 'AI analyzed project', intel.current_bottleneck ?? undefined, actorUserId)

  const row = firstRow<Record<string, unknown>>(await sql`SELECT * FROM projects WHERE id = ${projectId}::uuid`)
  return row ?? null
}

export type GeneratedPlan = {
  phases: { title: string; duration_days: number }[]
  milestones: { title: string; offset_days: number }[]
  tasks: { title: string; phase: string; status?: string }[]
  estimated_duration_days: number
  suggested_task_count: number
  team_suggestions: { role: string; note: string }[]
}

export async function generateProjectPlan(projectId: string, actorUserId?: string): Promise<GeneratedPlan | null> {
  const ctx = await loadProjectContext(projectId)
  if (!ctx) return null

  const { project } = ctx
  const fallback: GeneratedPlan = {
    phases: [
      { title: 'Discovery', duration_days: 3 },
      { title: 'Wireframes', duration_days: 4 },
      { title: 'Homepage Design', duration_days: 5 },
      { title: 'Development', duration_days: 7 },
      { title: 'Testing', duration_days: 3 },
      { title: 'Launch', duration_days: 2 },
    ],
    milestones: [
      { title: 'Discovery completed', offset_days: 3 },
      { title: 'Design approved', offset_days: 12 },
      { title: 'Development started', offset_days: 13 },
      { title: 'Testing', offset_days: 20 },
      { title: 'Launch', offset_days: 24 },
    ],
    tasks: [
      { title: 'Kickoff call', phase: 'Discovery', status: 'todo' },
      { title: 'Requirements doc', phase: 'Discovery', status: 'todo' },
      { title: 'Homepage wireframe', phase: 'Wireframes', status: 'todo' },
      { title: 'Product page wireframe', phase: 'Wireframes', status: 'todo' },
      { title: 'Hero banner design', phase: 'Homepage Design', status: 'todo' },
      { title: 'Store setup', phase: 'Development', status: 'todo' },
      { title: 'Checkout testing', phase: 'Testing', status: 'todo' },
    ],
    estimated_duration_days: 24,
    suggested_task_count: 32,
    team_suggestions: [
      { role: 'project_manager', note: 'Own client communication and milestones' },
      { role: 'designer', note: 'UI/UX and brand assets' },
      { role: 'developer', note: 'Build and integrations' },
      { role: 'qa', note: 'Testing before launch' },
    ],
  }

  let plan = fallback
  if (openai) {
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `Generate a delivery plan for an agency software project. Return ONLY JSON matching:
{ "phases":[{"title":"string","duration_days":number}], "milestones":[{"title":"string","offset_days":number}],
  "tasks":[{"title":"string","phase":"string","status":"todo"}], "estimated_duration_days":number,
  "suggested_task_count":number, "team_suggestions":[{"role":"string","note":"string"}] }`,
          },
          {
            role: 'user',
            content: JSON.stringify({
              name: project.name,
              type: project.project_type ?? inferProjectType(String(project.name), String(project.internal_notes ?? '')),
              budget_cents: project.budget_cents,
              notes: project.internal_notes,
            }),
          },
        ],
        max_tokens: 1500,
        temperature: 0.6,
        response_format: { type: 'json_object' },
      })
      const parsed = parseJson<GeneratedPlan>(res.choices[0]?.message?.content ?? '')
      if (parsed?.milestones?.length) plan = { ...fallback, ...parsed }
    } catch {
      /* fallback */
    }
  }

  const start = project.start_date ? new Date(String(project.start_date)) : new Date()
  for (const m of plan.milestones) {
    const due = new Date(start.getTime() + m.offset_days * 86400000)
    await sql`
      INSERT INTO milestones (project_id, title, due_at, "createdAt")
      SELECT ${projectId}::uuid, ${m.title}, ${due.toISOString()}, NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM milestones WHERE project_id = ${projectId}::uuid AND title = ${m.title}
      )
    `
  }

  for (const t of plan.tasks.slice(0, 20)) {
    await sql`
      INSERT INTO tasks (project_id, title, status, priority, "createdAt", "updatedAt")
      SELECT ${projectId}::uuid, ${t.title}, ${t.status ?? 'todo'}, 'medium', NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM tasks WHERE project_id = ${projectId}::uuid AND title = ${t.title}
      )
    `
  }

  const phases = buildPhasesFromProgress(5)
  const intel = buildPreviewIntel(project as never)
  intel.ai_summary = `AI generated a ${plan.estimated_duration_days}-day delivery plan with ${plan.suggested_task_count} suggested tasks across ${plan.phases.length} phases.`

  await sql`
    UPDATE projects SET
      target_end_date = COALESCE(target_end_date, ${new Date(start.getTime() + plan.estimated_duration_days * 86400000).toISOString()}::date),
      start_date = COALESCE(start_date, ${start.toISOString()}::date),
      delivery_phases = ${JSON.stringify(phases)}::jsonb,
      ai_intelligence = ${JSON.stringify(intel)}::jsonb,
      status = COALESCE(NULLIF(status, ''), 'planning'),
      "updatedAt" = NOW()
    WHERE id = ${projectId}::uuid
  `

  await logProjectActivity(
    projectId,
    'plan_generated',
    'AI project plan generated',
    `${plan.milestones.length} milestones · ${plan.tasks.length} tasks · ${plan.estimated_duration_days} days`,
    actorUserId,
  )

  if (actorUserId) {
    await sql`
      INSERT INTO activity_logs (clerk_user_id, action, entity_type, entity_id, details)
      VALUES (
        ${actorUserId},
        'plan_generated',
        'project',
        ${projectId},
        ${JSON.stringify({ milestones: plan.milestones.length, tasks: plan.tasks.length })}::jsonb
      )
    `
  }

  return plan
}
