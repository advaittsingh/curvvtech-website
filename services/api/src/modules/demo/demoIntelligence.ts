import OpenAI from 'openai'
import { pool } from '../../db.js'
import { firstRow, sql } from '../../lib/sqlPool.js'
import { logInboundActivity, seedInboundTimeline } from './inboundActivity.js'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'

export type DemoIntelligence = {
  company?: string
  industry?: string
  business_type?: string
  project_type?: string
  budget_range?: string
  budget_min_cents?: number
  budget_max_cents?: number
  timeline?: string
  urgency?: string
  website?: string
  location?: string
  requirements_summary?: string
  features?: string[]
  lead_score?: number
  score_100?: number
  confidence_percent?: number
  close_probability?: number
  potential_value_label?: string
  project_complexity?: string
  recommended_services?: string[]
  recommended_proposal?: string
  ai_summary?: string
  recommended_solution?: string
  estimated_budget_label?: string
  risks?: string[]
  upsells?: string[]
}

export type DemoRequestIntelRow = {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  date: string
  time: string
  status: string
  sales_stage: string | null
  message: string | null
  requirements: string | null
  project_type: string | null
  budget: string | null
  timeline: string | null
  website: string | null
  location: string | null
  inbound_source: string | null
  ai_intelligence: DemoIntelligence | null
  lead_score: number | null
  deal_value_cents: number | null
  close_probability: number | null
  assigned_user_id: string | null
  converted_lead_id: string | null
  converted_client_id: string | null
  analyzed_at: string | null
  created_at: string
  updated_at: string
}

const DEMO_SELECT = `id::text, name, email, phone, company, date::text, "time"::text, status,
  sales_stage, message, requirements, project_type, budget, timeline, website, location,
  inbound_source, ai_intelligence, lead_score, deal_value_cents, close_probability,
  assigned_user_id::text, converted_lead_id::text, converted_client_id::text,
  analyzed_at::text, created_at::text, updated_at::text`

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw.replace(/^```json\n?|\n?```$/g, '').trim()) as T
  } catch {
    return null
  }
}

function parseIntel(raw: unknown): DemoIntelligence | null {
  if (!raw) return null
  let obj = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (typeof obj !== 'object' || obj === null) return null
  const intel = obj as DemoIntelligence
  if (
    !intel.ai_summary &&
    intel.lead_score == null &&
    !intel.potential_value_label &&
    !(intel.recommended_services?.length)
  ) {
    return null
  }
  return intel
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function normalizeRow(row: DemoRequestIntelRow): DemoRequestIntelRow {
  const intel = parseIntel(row.ai_intelligence)
  const leadScore = num(row.lead_score)
  return {
    ...row,
    sales_stage: row.sales_stage ?? 'new',
    ai_intelligence: intel,
    lead_score: leadScore,
    close_probability: num(row.close_probability),
    deal_value_cents: num(row.deal_value_cents),
    time: String(row.time).slice(0, 5),
  }
}

function inferBusinessType(row: DemoRequestIntelRow): string {
  const text = `${row.company ?? ''} ${row.message ?? ''} ${row.requirements ?? ''}`.toLowerCase()
  if (/fashion|apparel|clothing|brand|boutique/.test(text)) return 'Fashion / D2C Brand'
  if (/realty|real estate|property/.test(text)) return 'Real Estate'
  if (/shopify|ecommerce|e-commerce|store/.test(text)) return 'E-commerce Business'
  if (/saas|startup|app/.test(text)) return 'Technology Startup'
  if (row.company) return 'Growing Business'
  return 'Individual / SMB'
}

export function heuristicIntelligence(row: DemoRequestIntelRow): DemoIntelligence {
  const company = row.company ?? row.name
  let score100 = 55
  if (row.company) score100 += 12
  if (row.phone) score100 += 6
  if (row.website) score100 += 5
  if (row.budget) score100 += 10
  if (row.requirements || row.message) score100 += 12
  if (row.project_type) score100 += 5
  score100 = Math.min(92, score100)

  const dealCents = row.deal_value_cents ?? parseBudgetHintToCents(row.budget) ?? 12000000
  const minCents = Math.round(dealCents * 0.65)
  const closeProb = Math.min(88, 35 + Math.round(score100 * 0.45))
  const businessType = inferBusinessType(row)
  const project = row.project_type ?? (businessType.includes('E-commerce') || businessType.includes('Fashion') ? 'Shopify Store' : 'Custom Software Platform')
  const valueLabel = formatInrRange(minCents, dealCents)

  const summary = row.message ?? row.requirements
    ? `This enquiry appears to be from ${company}${row.company ? '' : ' (individual contact)'} seeking ${project.toLowerCase()}. Based on the information provided, we recommend a discovery call to clarify scope before preparing a formal proposal.`
    : `${company} booked a demo slot (${row.date} ${row.time}). Qualify project scope, budget, and timeline on the discovery call.`

  return {
    company,
    industry: businessType.split(' / ')[0] ?? 'General',
    business_type: businessType,
    project_type: project,
    budget_range: row.budget ?? valueLabel,
    budget_min_cents: minCents,
    budget_max_cents: dealCents,
    timeline: row.timeline ?? '4–8 weeks',
    urgency: row.timeline ? 'Medium' : 'Low',
    website: row.website ?? undefined,
    location: row.location ?? undefined,
    requirements_summary: row.requirements ?? row.message ?? summary,
    features: row.message ? ['Custom scope from enquiry', 'Discovery call recommended'] : ['Discovery call', 'Scoped proposal'],
    lead_score: score100 / 10,
    score_100: score100,
    confidence_percent: Math.min(90, score100 - 5),
    close_probability: closeProb,
    potential_value_label: valueLabel,
    project_complexity: dealCents >= 30000000 ? 'High' : dealCents >= 10000000 ? 'Medium' : 'Low',
    recommended_services: ['Website', 'Admin Panel', project.includes('Shopify') ? 'CRM Integration' : 'Mobile App'],
    recommended_proposal: project.includes('Shopify') ? 'E-Commerce Launch Package' : 'Digital Transformation Package',
    ai_summary: summary,
    recommended_solution: project,
    estimated_budget_label: valueLabel,
    risks: ['Budget not fully confirmed', 'Requirements may need discovery'],
    upsells: ['Mobile App', 'CRM', 'AI Automation', 'Monthly Maintenance'],
  }
}

export function parseBudgetHintToCents(budget: string | null | undefined): number | null {
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

function formatInrRange(minCents: number, maxCents: number): string {
  const fmt = (c: number) => {
    const r = c / 100
    if (r >= 100000) return `₹${(r / 100000).toFixed(r >= 1000000 ? 1 : 2)}L`.replace(/\.00L/, 'L')
    if (r >= 1000) return `₹${Math.round(r / 1000)}K`
    return `₹${Math.round(r).toLocaleString('en-IN')}`
  }
  return `${fmt(minCents)} – ${fmt(maxCents)}`
}

export function buildDemoContext(row: DemoRequestIntelRow): string {
  const intel = row.ai_intelligence ?? heuristicIntelligence(row)
  return [
    `Name: ${row.name}`,
    `Email: ${row.email}`,
    row.phone ? `Phone: ${row.phone}` : null,
    row.company ? `Company: ${row.company}` : null,
    row.location ? `Location: ${row.location}` : null,
    row.website ? `Website: ${row.website}` : null,
    intel.business_type ? `Business type: ${intel.business_type}` : null,
    row.project_type ? `Project type: ${row.project_type}` : null,
    row.budget ? `Budget hint: ${row.budget}` : null,
    row.timeline ? `Timeline: ${row.timeline}` : null,
    `Demo slot: ${row.date} ${row.time}`,
    row.requirements ? `Requirements: ${row.requirements}` : null,
    row.message ? `Message: ${row.message}` : null,
    intel.ai_summary ? `AI summary: ${intel.ai_summary}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

const ANALYZE_SYSTEM = `You are a senior sales analyst at CurvvTech, a premium software agency in India.

Analyze this inbound enquiry and return JSON only:
{
  "company": "string",
  "industry": "string",
  "business_type": "e.g. Fashion Brand, Real Estate Agency, SaaS Startup",
  "project_type": "e.g. Shopify Store, Corporate Website, Mobile App",
  "budget_range": "human INR range e.g. ₹80,000 – ₹1,20,000",
  "budget_min_cents": number,
  "budget_max_cents": number,
  "timeline": "string",
  "urgency": "Low|Medium|High",
  "website": "string or empty",
  "location": "string or empty",
  "requirements_summary": "2-3 sentences",
  "features": ["Catalog", "Payments", "Admin Panel"],
  "score_100": integer 0-100,
  "lead_score": number 0-10 one decimal (score_100 / 10),
  "confidence_percent": integer 0-100,
  "close_probability": integer 0-100,
  "potential_value_label": "₹X – ₹Y",
  "project_complexity": "Low|Medium|High",
  "recommended_services": ["Website", "Admin Panel", "CRM"],
  "recommended_proposal": "package name e.g. E-Commerce Launch Package",
  "ai_summary": "2-3 sentence consultative summary for sales team",
  "recommended_solution": "short solution name",
  "estimated_budget_label": "₹X – ₹Y",
  "risks": ["risk1"],
  "upsells": ["Mobile App", "CRM", "AI Automation"]
}

Use INR. amount_cents = rupees * 100. Be specific — never return empty strings for score, value, or summary.`

function finalizeIntelligence(row: DemoRequestIntelRow, intelligence: DemoIntelligence): DemoIntelligence {
  const base = heuristicIntelligence(row)
  const merged = { ...base, ...intelligence }
  if (merged.score_100 == null && merged.lead_score != null) {
    merged.score_100 = Math.round(Number(merged.lead_score) * 10)
  }
  if (merged.lead_score == null && merged.score_100 != null) {
    merged.lead_score = Math.round(merged.score_100) / 10
  }
  if (merged.confidence_percent == null) {
    merged.confidence_percent = Math.min(95, (merged.score_100 ?? 60) - 3)
  }
  if (!merged.potential_value_label && merged.budget_min_cents && merged.budget_max_cents) {
    merged.potential_value_label = formatInrRange(merged.budget_min_cents, merged.budget_max_cents)
  }
  if (!merged.ai_summary) merged.ai_summary = base.ai_summary
  if (!merged.recommended_services?.length) merged.recommended_services = base.recommended_services
  return merged
}

export async function analyzeDemoRequest(demoId: string, actorUserId?: string | null): Promise<DemoRequestIntelRow | null> {
  const row = await getDemoRequestIntel(demoId)
  if (!row) return null

  await seedInboundTimeline(demoId)

  let intelligence = heuristicIntelligence(row)
  if (openai) {
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: ANALYZE_SYSTEM },
          { role: 'user', content: buildDemoContext(row) },
        ],
        max_tokens: 1400,
        temperature: 0.55,
        response_format: { type: 'json_object' },
      })
      const parsed = parseJson<DemoIntelligence>(res.choices[0]?.message?.content?.trim() ?? '')
      if (parsed) intelligence = finalizeIntelligence(row, parsed)
    } catch {
      /* keep heuristic */
    }
  }

  intelligence = finalizeIntelligence(row, intelligence)
  const dealCents = intelligence.budget_max_cents ?? row.deal_value_cents ?? 12000000

  await sql`
    UPDATE demo_requests SET
      ai_intelligence = ${JSON.stringify(intelligence)}::jsonb,
      lead_score = ${intelligence.lead_score ?? null},
      deal_value_cents = ${dealCents},
      close_probability = ${intelligence.close_probability ?? null},
      project_type = COALESCE(${intelligence.project_type ?? null}, project_type),
      budget = COALESCE(${intelligence.budget_range ?? null}, budget),
      timeline = COALESCE(${intelligence.timeline ?? null}, timeline),
      website = COALESCE(NULLIF(${intelligence.website ?? ''}, ''), website),
      location = COALESCE(NULLIF(${intelligence.location ?? ''}, ''), location),
      requirements = COALESCE(${intelligence.requirements_summary ?? null}, requirements),
      analyzed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${demoId}::uuid
  `

  await logInboundActivity(
    demoId,
    'ai_analyzed',
    'AI analyzed',
    `Score ${intelligence.score_100 ?? '—'}/100 · ${intelligence.potential_value_label ?? 'Value estimated'}`,
    actorUserId,
    { score_100: intelligence.score_100, close_probability: intelligence.close_probability },
  )

  return getDemoRequestIntel(demoId)
}

export async function analyzePendingDemos(limit = 10): Promise<number> {
  const rows = (await pool.query(
    `SELECT id::text FROM demo_requests WHERE analyzed_at IS NULL ORDER BY created_at DESC LIMIT $1`,
    [limit],
  ).then((r) => r.rows)) as { id: string }[]
  let count = 0
  for (const r of rows) {
    const result = await analyzeDemoRequest(r.id)
    if (result) count++
  }
  return count
}

export async function getDemoRequestIntel(id: string): Promise<DemoRequestIntelRow | null> {
  const row = firstRow<DemoRequestIntelRow>(
    await pool.query(`SELECT ${DEMO_SELECT} FROM demo_requests WHERE id = $1::uuid`, [id]).then((r) => r.rows),
  )
  if (!row) return null
  return normalizeRow(row)
}

export async function listDemoRequestsIntel(): Promise<DemoRequestIntelRow[]> {
  const rows = (await pool.query(
    `SELECT ${DEMO_SELECT} FROM demo_requests ORDER BY created_at DESC, date DESC, "time" DESC`,
  ).then((r) => r.rows)) as DemoRequestIntelRow[]
  return rows.map(normalizeRow)
}

export async function generateDemoFollowUp(demoId: string, tone = 'professional and friendly'): Promise<string> {
  const row = await getDemoRequestIntel(demoId)
  if (!row) throw new Error('Not found')
  const context = buildDemoContext(row)
  if (!openai) {
    const intel = row.ai_intelligence ?? heuristicIntelligence(row)
    return `Subject: Thank you for your interest in CurvvTech\n\nHi ${row.name},\n\nThank you for reaching out to CurvvTech. Based on your requirements, we believe a ${intel.recommended_solution ?? 'custom digital solution'} would best suit your needs.\n\nWe'd love to schedule a discovery call to understand your goals in more detail.\n\nBest regards,\nCurvvTech Team`
  }
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `Write a concise follow-up email for CurvvTech. Tone: ${tone}. Include subject line as first line prefixed with "Subject: ". Reference their specific requirements.`,
      },
      { role: 'user', content: context },
    ],
    max_tokens: 700,
    temperature: 0.65,
  })
  return res.choices[0]?.message?.content?.trim() ?? ''
}

export async function runDemoAiAction(
  demoId: string,
  action: string,
): Promise<{ text: string; result?: unknown }> {
  const row = await getDemoRequestIntel(demoId)
  if (!row) throw new Error('Not found')
  const context = buildDemoContext(row)

  const prompts: Record<string, string> = {
    summarize: 'Summarize this lead in 4 bullet points for a sales rep.',
    estimate_cost: 'Estimate project budget in INR with low/high range and rationale. Start with "Estimated range:"',
    estimate_budget: 'Estimate project budget in INR with low/high range and rationale.',
    discovery_questions: 'Generate 6 discovery call questions. Numbered list only.',
    suggest_questions: 'Generate 6 discovery call questions. Numbered list only.',
    upsells: 'Suggest 4 relevant upsell services. Bulleted list with brief rationale.',
    recommend_services: 'Recommend CurvvTech services for this client. Bulleted list.',
    risks: 'Identify 3 deal risks and mitigation steps. Bulleted list.',
    proposal_outline: 'Outline a consulting proposal structure. Bulleted sections.',
    generate_proposal: 'Outline a consulting proposal with section summaries tailored to this client.',
    generate_followup: 'Draft a follow-up email with Subject: line first.',
    close_probability: 'Estimate close probability 0-100 with 2 sentence rationale.',
  }

  const system = prompts[action] ?? 'Help the sales team with this inbound opportunity.'
  if (!openai) {
    const intel = row.ai_intelligence ?? heuristicIntelligence(row)
    return {
      text: `[Preview — set OPENAI_API_KEY for live AI]\n\n${system}\n\nScore: ${intel.score_100}/100\nValue: ${intel.potential_value_label}\nSummary: ${intel.ai_summary}`,
    }
  }
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: `You are CurvvTech sales AI. ${system}` },
      { role: 'user', content: context },
    ],
    max_tokens: 900,
    temperature: 0.6,
  })
  return { text: res.choices[0]?.message?.content?.trim() ?? '' }
}

export function queueDemoAnalysis(demoId: string): void {
  void analyzeDemoRequest(demoId).catch(() => {})
}

export function score100FromRow(row: DemoRequestIntelRow): number {
  if (row.ai_intelligence?.score_100) return row.ai_intelligence.score_100
  if (row.lead_score != null) return Math.round(Number(row.lead_score) * 10)
  return heuristicIntelligence(row).score_100 ?? 60
}
