import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'

/** Consulting-style proposal sections (Young Boyz Toyz / premium agency format) */
export const CONSULTING_PROPOSAL_SECTIONS = [
  { section_key: 'cover', title: 'Cover', content: '', block_type: 'text' },
  { section_key: 'executive_summary', title: 'Executive Summary', content: '', block_type: 'text' },
  { section_key: 'business_understanding', title: 'Business Understanding', content: '', block_type: 'text' },
  { section_key: 'project_objectives', title: 'Project Objectives', content: '', block_type: 'text' },
  { section_key: 'proposed_solution', title: 'Proposed Solution', content: '', block_type: 'text' },
  { section_key: 'detailed_scope', title: 'Detailed Scope of Work', content: '', block_type: 'scope_modules' },
  { section_key: 'feature_recommendations', title: 'Why We Recommend These Features', content: '', block_type: 'text' },
  { section_key: 'monetization', title: 'Monetization Opportunities', content: '', block_type: 'text' },
  { section_key: 'ai_opportunities', title: 'AI Opportunities', content: '', block_type: 'text' },
  { section_key: 'tech_architecture', title: 'Technical Architecture', content: '', block_type: 'text' },
  { section_key: 'development_roadmap', title: 'Development Roadmap', content: '', block_type: 'timeline' },
  { section_key: 'why_curvvtech', title: 'Why CurvvTech', content: '', block_type: 'text' },
  { section_key: 'pricing', title: 'Investment & Milestones', content: '', block_type: 'pricing' },
  { section_key: 'addons', title: 'Optional Add-ons', content: '', block_type: 'addons' },
  { section_key: 'terms', title: 'Terms & Conditions', content: '', block_type: 'text' },
  { section_key: 'signature', title: 'Signature', content: '', block_type: 'signature' },
] as const

export type ProposalContextInput = {
  title?: string | null
  client_name?: string | null
  project_type?: string | null
  total_cents?: number | null
  lead_name?: string | null
  lead_company?: string | null
  requirements?: string | null
  message?: string | null
  budget?: string | null
  timeline?: string | null
  deal_value_cents?: number | null
  source?: string | null
  tags?: string[] | null
}

export type BusinessAnalysis = {
  company: string
  industry: string
  business_model: string
  growth_opportunity: string
  recommended_solution: string
  summary: string
}

export type ConsultingProposalResult = {
  business_analysis: BusinessAnalysis
  cover: string
  sections: { section_key: string; content: string }[]
  scope_modules: { groups: { title: string; items: string[] }[] }
  timeline_milestones: { title: string; start_date?: string; end_date?: string; description?: string }[]
  line_items: { description: string; qty: number; amount_cents: number }[]
  payment_milestones: { label: string; percent: number }[]
  addons: { name: string; amount_cents: number }[]
}

function parseJson<T>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/^```json\n?|\n?```$/g, '').trim()
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}

async function complete(system: string, user: string, maxTokens = 1200): Promise<string> {
  if (!openai) {
    throw new Error('OPENAI_API_KEY is not configured on the server')
  }
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user.slice(0, 12000) },
    ],
    max_tokens: maxTokens,
    temperature: 0.65,
    response_format: { type: 'json_object' },
  })
  return res.choices[0]?.message?.content?.trim() ?? ''
}

export function buildProposalContext(input: ProposalContextInput): string {
  const client = input.client_name ?? input.lead_company ?? input.lead_name ?? 'Client'
  const valueInr = Number(input.total_cents ?? input.deal_value_cents ?? 0) / 100
  const reqs = [input.requirements, input.message].filter(Boolean).join('\n\n')
  const tags = (input.tags ?? []).join(', ')

  return [
    `Client / Company: ${client}`,
    input.lead_name ? `Contact: ${input.lead_name}` : null,
    `Project type: ${input.project_type ?? 'Custom digital product'}`,
    `Proposal title: ${input.title ?? `${client} Proposal`}`,
    valueInr > 0 ? `Budget / deal value: ₹${valueInr.toLocaleString('en-IN')} INR` : input.budget ? `Budget hint: ${input.budget}` : null,
    input.timeline ? `Timeline hint: ${input.timeline}` : null,
    input.source ? `Lead source: ${input.source}` : null,
    tags ? `Tags: ${tags}` : null,
    reqs ? `Requirements & notes:\n${reqs}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

const ARCHITECT_SYSTEM = `You are a senior solution architect and business consultant at CurvvTech, a premium software agency in India.

Analyze the client context deeply. Infer industry, business model, and growth opportunities from company name, requirements, and project type.

Do NOT write generic software agency content. Every insight must reference the client's specific business.

Return JSON only:
{
  "company": "string",
  "industry": "string",
  "business_model": "string",
  "growth_opportunity": "string",
  "recommended_solution": "string (e.g. Marketplace + Mobile App + Admin Portal)",
  "summary": "2-3 sentence executive insight about why they need this project"
}`

export async function generateBusinessAnalysis(context: string): Promise<BusinessAnalysis | null> {
  const raw = await complete(ARCHITECT_SYSTEM, context, 900)
  const parsed = parseJson<BusinessAnalysis>(raw)
  if (!parsed?.company) return null
  return parsed
}

const PROPOSAL_SYSTEM = `You are a senior solution architect at CurvvTech writing a premium consulting proposal.

You have already analyzed the client's business. Write a detailed, custom proposal — NOT a generic template.

Rules:
- Reference the client by name throughout
- Explain WHY each recommendation matters for their business
- Use consulting tone: strategic, specific, confident — not a sales brochure
- Never write "We build software" or generic agency filler
- Include industry-specific modules (Website, Mobile App, Admin Panel, Client Portal, Automations, Analytics as relevant)
- Monetization and AI sections must be tailored to their business model
- Pricing in INR (amount_cents = rupees * 100)
- Timeline phases: Discovery, UI/UX, Development, Testing, Launch, Optimization (adjust for project)

Return JSON only:
{
  "cover": "Formatted cover page text with Prepared For, Prepared By CurvvTech, Date, Reference",
  "sections": [
    {"section_key":"executive_summary","content":"..."},
    {"section_key":"business_understanding","content":"..."},
    {"section_key":"project_objectives","content":"bullet list as text"},
    {"section_key":"proposed_solution","content":"..."},
    {"section_key":"feature_recommendations","content":"why each major feature is recommended"},
    {"section_key":"monetization","content":"potential revenue streams for THIS client"},
    {"section_key":"ai_opportunities","content":"AI features recommended for THIS client"},
    {"section_key":"tech_architecture","content":"recommended stack and architecture"},
    {"section_key":"why_curvvtech","content":"why CurvvTech is the right partner"},
    {"section_key":"terms","content":"brief terms for India-based agency"}
  ],
  "scope_modules": {
    "groups": [
      {"title":"Website","items":["Homepage","..."]},
      {"title":"Mobile App","items":["..."]},
      {"title":"Admin Panel","items":["..."]}
    ]
  },
  "timeline_milestones": [
    {"title":"Phase 1 — Discovery","start_date":"","end_date":"","description":"..."}
  ],
  "line_items": [{"description":"...","qty":1,"amount_cents":2000000}],
  "payment_milestones": [{"label":"50% Advance","percent":50}],
  "addons": [{"name":"SEO Setup","amount_cents":1000000}]
}`

export async function generateConsultingProposal(
  context: string,
  analysis: BusinessAnalysis,
): Promise<ConsultingProposalResult | null> {
  const user = `${context}

--- BUSINESS ANALYSIS (use this as foundation) ---
Company: ${analysis.company}
Industry: ${analysis.industry}
Business model: ${analysis.business_model}
Growth opportunity: ${analysis.growth_opportunity}
Recommended solution: ${analysis.recommended_solution}
Summary: ${analysis.summary}

Generate the full consulting proposal JSON. Make it feel written specifically for ${analysis.company}.`

  const raw = await complete(PROPOSAL_SYSTEM, user, 4500)
  const parsed = parseJson<Omit<ConsultingProposalResult, 'business_analysis'>>(raw)
  if (!parsed?.sections?.length) return null

  return {
    business_analysis: analysis,
    cover: parsed.cover ?? '',
    sections: parsed.sections,
    scope_modules: parsed.scope_modules ?? { groups: [] },
    timeline_milestones: parsed.timeline_milestones ?? [],
    line_items: parsed.line_items ?? [],
    payment_milestones: parsed.payment_milestones ?? [
      { label: '50% Advance', percent: 50 },
      { label: '30% Testing', percent: 30 },
      { label: '20% Delivery', percent: 20 },
    ],
    addons: parsed.addons ?? [],
  }
}

export async function runConsultingProposalEngine(
  input: ProposalContextInput,
): Promise<ConsultingProposalResult | null> {
  const context = buildProposalContext(input)
  const analysis = await generateBusinessAnalysis(context)
  if (!analysis) return null
  return generateConsultingProposal(context, analysis)
}

const SECTION_KEY_ALIASES: Record<string, string> = {
  executive_summary: 'executive_summary',
  'executive summary': 'executive_summary',
  business_understanding: 'business_understanding',
  project_objectives: 'project_objectives',
  proposed_solution: 'proposed_solution',
  detailed_scope: 'detailed_scope',
  scope: 'detailed_scope',
  'scope of work': 'detailed_scope',
  deliverables: 'detailed_scope',
  feature_recommendations: 'feature_recommendations',
  monetization: 'monetization',
  ai_opportunities: 'ai_opportunities',
  tech_architecture: 'tech_architecture',
  development_roadmap: 'development_roadmap',
  timeline: 'development_roadmap',
  why_curvvtech: 'why_curvvtech',
  about: 'why_curvvtech',
  'about curvvtech': 'why_curvvtech',
  terms: 'terms',
  cover: 'cover',
}

function normalizeSectionKey(raw: string): string {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  const slug = normalized.replace(/\s+/g, '_')
  return SECTION_KEY_ALIASES[normalized] ?? SECTION_KEY_ALIASES[slug] ?? slug
}

export function consultingResultToMetadata(result: ConsultingProposalResult, proposalId?: string) {
  const id = () => Math.random().toString(36).slice(2, 10)
  const total = result.line_items.reduce((s, i) => s + i.qty * i.amount_cents, 0)

  const sectionContent: Record<string, string> = {}
  if (result.cover?.trim()) sectionContent.cover = result.cover
  for (const s of result.sections) {
    if (!s.content?.trim()) continue
    sectionContent[normalizeSectionKey(s.section_key)] = s.content
  }

  return {
    total_cents: total,
    metadata_json: {
      business_analysis: result.business_analysis,
      scope_modules: result.scope_modules,
      line_items: result.line_items.map((i) => ({ ...i, id: id() })),
      payment_milestones: result.payment_milestones.map((m) => ({ ...m, id: id() })),
      timeline_milestones: result.timeline_milestones.map((m) => ({ ...m, id: id() })),
      addons: result.addons.map((a) => ({ ...a, id: id() })),
      signature: {},
      proposal_reference: proposalId ? `PROP-${proposalId.slice(0, 8).toUpperCase()}` : undefined,
    },
    sectionContent,
  }
}
