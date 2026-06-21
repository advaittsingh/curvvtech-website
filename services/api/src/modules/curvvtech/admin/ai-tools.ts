import OpenAI from 'openai'
import { Router } from 'express'
import { pool } from '../../../db.js'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'
import {
  buildProposalContext,
  generateBusinessAnalysis,
  runConsultingProposalEngine,
} from '../services/proposalEngine.js'
import { applyConsultingResult } from '../services/proposalApply.js'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const router = Router()
router.use(requireCurvvtechAdmin)

async function complete(system: string, user: string): Promise<string> {
  if (!openai) return '[AI unavailable — set OPENAI_API_KEY]'
  const res = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user.slice(0, 8000) },
    ],
    max_tokens: 1200,
    temperature: 0.7,
  })
  return res.choices[0]?.message?.content?.trim() ?? ''
}

router.post('/proposal-action', async (req, res) => {
  try {
    const { proposal_id, action, tone } = req.body
    const proposal = firstRow<Record<string, unknown>>(await sql`
      SELECT p.*, l.name AS lead_name, l.company AS lead_company, l.requirements, l.message,
        l.project_type AS lead_project_type, l.budget, l.timeline, l.deal_value_cents, l.source, l.tags
      FROM proposals p
      LEFT JOIN crm_leads l ON l.id = p.lead_id
      WHERE p.id = ${proposal_id}::uuid
    `)
    if (!proposal) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    const ctxInput = {
      title: String(proposal.title ?? ''),
      client_name: proposal.client_name ? String(proposal.client_name) : null,
      project_type: String(proposal.project_type ?? proposal.lead_project_type ?? 'Custom'),
      total_cents: Number(proposal.total_cents ?? 0),
      lead_name: proposal.lead_name ? String(proposal.lead_name) : null,
      lead_company: proposal.lead_company ? String(proposal.lead_company) : null,
      requirements: proposal.requirements ? String(proposal.requirements) : null,
      message: proposal.message ? String(proposal.message) : null,
      budget: proposal.budget ? String(proposal.budget) : null,
      timeline: proposal.timeline ? String(proposal.timeline) : null,
      deal_value_cents: proposal.deal_value_cents ? Number(proposal.deal_value_cents) : null,
      source: proposal.source ? String(proposal.source) : null,
      tags: Array.isArray(proposal.tags) ? (proposal.tags as string[]) : null,
    }
    const context = buildProposalContext(ctxInput)

    if (action === 'business_analysis') {
      const analysis = await generateBusinessAnalysis(context)
      if (!analysis) {
        res.status(503).json({ error: 'AI unavailable' })
        return
      }
      res.json({ action, result: { business_analysis: analysis }, text: analysis.summary })
      return
    }

    if (action === 'generate_consulting') {
      const result = await runConsultingProposalEngine(ctxInput)
      if (!result) {
        res.status(503).json({ error: 'AI generation failed — check OPENAI_API_KEY and try again' })
        return
      }
      const proposal = await applyConsultingResult(String(proposal_id), result)
      if (!proposal) {
        res.status(500).json({ error: 'Failed to save generated proposal' })
        return
      }
      res.json({
        action,
        result,
        business_analysis: result.business_analysis,
        proposal,
        text: result.business_analysis.summary,
      })
      return
    }

    const projectType = ctxInput.project_type
    const typeHints: Record<string, string> = {
      'Shopify Website': 'luxury ecommerce Shopify store — product catalog, checkout, brand experience, not generic software',
      'Corporate Website': 'corporate B2B website — brand positioning, CMS, lead generation',
      'Mobile App': 'mobile app — iOS/Android, UX flows, app store launch',
      'Web Application': 'custom web app — dashboards, auth, scalable architecture',
      'Web App': 'custom web app — dashboards, auth, scalable architecture',
      'AI Solution': 'AI agent/automation — workflows, integrations, measurable ROI',
      'AI Agent': 'AI agent platform — knowledge base, custom workflows, deployment',
      'Smart Meter': 'IoT smart meter — hardware integration, dashboards, compliance',
      Maintenance: 'AMC monthly maintenance — SLA, support scope, response times',
    }
    const typeHint = typeHints[projectType] ?? `${projectType} project`

    const prompts: Record<string, string> = {
      generate_all: `Legacy action — prefer generate_consulting. Write sections as JSON {sections:[{section_key,content}]}. Tailor to: ${typeHint}.`,
      executive_summary: `Write executive summary — 2 paragraphs referencing the client's specific business. Not generic.`,
      improve_scope: `Rewrite detailed scope — specific modules for ${typeHint}.`,
      business_understanding: `Write Business Understanding section — explain client's industry, challenges, and why digital transformation is needed now.`,
      project_objectives: `Write Project Objectives as bullet list derived from requirements.`,
      proposed_solution: `Write Proposed Solution — Website, App, Admin, Portal, Automations as relevant.`,
      feature_recommendations: `Write Why We Recommend These Features — consultative rationale tied to client goals.`,
      monetization: `Write Monetization Opportunities specific to this client's business model.`,
      ai_opportunities: `Write AI Opportunities CurvvTech recommends for this client.`,
      tech_architecture: `Write Technical Architecture — recommended stack, scalability, integrations.`,
      why_curvvtech: `Write Why CurvvTech — business-first, custom dev, AI expertise, long-term support.`,
      timeline: 'Return JSON {timeline_milestones:[{title,start_date,end_date,description}]}. Phases: Discovery, UI/UX, Development, Testing, Launch, Optimization.',
      pricing: `Return JSON {line_items:[{description,qty,amount_cents}], payment_milestones:[{label,percent}]}. INR.`,
      terms: 'Write terms and conditions for CurvvTech agency proposal in India.',
      shorten: 'Shorten while keeping consulting depth.',
      luxury_tone: `Premium consulting tone for ${typeHint}.`,
      corporate_tone: `Formal B2B consulting tone for ${typeHint}.`,
    }

    const system = prompts[String(action)] ?? 'Improve proposal content.'
    const toneHint = tone ? ` Tone: ${tone}.` : ''
    const content = await complete(
      `You are a senior CurvvTech solution architect writing consulting proposals.${toneHint} ${system} Return plain text or JSON as requested. Never generic.`,
      context,
    )

    let parsed: unknown = content
    if (action === 'generate_all' || action === 'pricing' || action === 'timeline') {
      try {
        parsed = JSON.parse(content.replace(/^```json\n?|\n?```$/g, ''))
      } catch {
        parsed = { content }
      }
    }

    res.json({ action, result: parsed, text: content })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/proposal', async (req, res) => {
  try {
    const { lead_id, client_name, project_type, budget, sections } = req.body
    let context = `Client: ${client_name ?? 'Unknown'}\nProject: ${project_type ?? 'Custom software'}\nBudget: ${budget ?? 'TBD'}`
    if (lead_id) {
      const lead = firstRow<{ name: string; company: string; message: string; budget: string; timeline: string }>(
        await sql`SELECT name, company, message, budget, timeline FROM crm_leads WHERE id = ${lead_id}::uuid`
      )
      if (lead) {
        context = `Lead: ${lead.name}\nCompany: ${lead.company}\nMessage: ${lead.message}\nBudget: ${lead.budget}\nTimeline: ${lead.timeline}`
      }
    }
    const sectionList = Array.isArray(sections) ? sections.join(', ') : 'scope, timeline, pricing, terms'
    const content = await complete(
      'You are a proposal writer for CurvvTech, a software agency. Write professional proposal section content in clear business English. Return JSON array of {title, content} objects.',
      `Write proposal sections (${sectionList}) for:\n${context}`
    )
    let parsed: unknown = content
    try {
      parsed = JSON.parse(content.replace(/^```json\n?|\n?```$/g, ''))
    } catch {
      parsed = [{ title: 'Generated content', content }]
    }
    res.json({ sections: parsed })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/invoice', async (req, res) => {
  try {
    const { client_id, project_id, description, amount_hint } = req.body
    let context = description ?? 'Professional services'
    if (client_id) {
      const client = firstRow<{ name: string; company: string }>(
        await sql`SELECT name, company FROM clients WHERE id = ${client_id}::uuid`
      )
      if (client) context = `Client: ${client.name} (${client.company})\n${context}`
    }
    if (project_id) {
      const project = firstRow<{ name: string; internal_notes: string | null; budget_cents: number }>(
        await sql`SELECT name, internal_notes, budget_cents FROM projects WHERE id = ${project_id}::uuid`
      )
      if (project) {
        const milestones = await sql`
          SELECT title FROM milestones WHERE project_id = ${project_id}::uuid ORDER BY due_at ASC NULLS LAST LIMIT 8
        `
        const msTitles = (milestones as { title: string }[]).map((m) => m.title).join(', ')
        context += `\nProject: ${project.name}\nBudget INR: ${Number(project.budget_cents ?? 0) / 100}\nMilestones: ${msTitles || 'none'}\nNotes: ${project.internal_notes ?? ''}`
      }
    }
    const content = await complete(
      'You generate invoice line items for a software agency. Return JSON: {items: [{description, quantity, unit_price_cents}], notes}',
      `Generate invoice items from project scope:\n${context}\nAmount hint (paise): ${amount_hint ?? 'split fairly across deliverables'}`
    )
    let parsed: unknown = { items: [], notes: content }
    try {
      parsed = JSON.parse(String(content).replace(/^```json\n?|\n?```$/g, ''))
    } catch {
      /* keep fallback */
    }
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/email-draft', async (req, res) => {
  try {
    const { lead_id, purpose, tone, demo_request_id } = req.body
    let context = purpose ?? 'Follow up on enquiry'
    if (lead_id) {
      const lead = firstRow<{ name: string; email: string; company: string; status: string; message: string }>(
        await sql`SELECT name, email, company, status, message FROM crm_leads WHERE id = ${lead_id}::uuid`
      )
      if (lead) context = `To: ${lead.name} <${lead.email}>\nCompany: ${lead.company}\nStatus: ${lead.status}\nOriginal message: ${lead.message}\nPurpose: ${purpose}`
    } else if (demo_request_id) {
      const { buildDemoContext, getDemoRequestIntel } = await import('../../demo/demoIntelligence.js')
      const demo = await getDemoRequestIntel(String(demo_request_id))
      if (demo) context = buildDemoContext(demo)
    }
    const draft = await complete(
      `Write a concise business email for CurvvTech. Tone: ${tone ?? 'professional and friendly'}. Include subject line as first line prefixed with "Subject: ".`,
      context
    )
    res.json({ draft })
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/client-summary', async (req, res) => {
  try {
    const { client_id } = req.body
    const client = firstRow<Record<string, unknown>>(await sql`
      SELECT c.*, u.email AS account_manager_email
      FROM clients c
      LEFT JOIN users u ON u.id::text = c.account_manager_id
      WHERE c.id = ${client_id}::uuid
    `)
    if (!client) {
      res.status(404).json({ error: 'Client not found' })
      return
    }

    const invResult = await pool.query(
      `SELECT
        COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (WHERE status = 'paid'), 0)::bigint AS received,
        COALESCE(SUM(COALESCE(total_cents, amount_cents, 0)) FILTER (WHERE status NOT IN ('paid','cancelled','draft')), 0)::bigint AS outstanding,
        COUNT(*) FILTER (WHERE status NOT IN ('paid','cancelled','draft'))::int AS pending
      FROM invoices WHERE client_id = $1::uuid`,
      [client_id],
    )
    const inv = invResult.rows[0] as Record<string, unknown>

    const projResult = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled'))::int AS active
       FROM projects WHERE client_id = $1::uuid`,
      [client_id],
    )
    const activeProjects = Number((projResult.rows[0] as Record<string, unknown>).active ?? 0)

    const commResult = await pool.query(
      `SELECT MAX("createdAt") AS last_at FROM client_communications WHERE client_id = $1::uuid`,
      [client_id],
    )
    const lastAt = commResult.rows[0]?.last_at as string | null
    const daysSince = lastAt
      ? Math.floor((Date.now() - new Date(lastAt).getTime()) / (1000 * 60 * 60 * 24))
      : null

    const outstanding = Number(inv.outstanding ?? 0)
    const context = [
      `Client: ${client.name}`,
      `Company: ${client.company ?? ''}`,
      `Active projects: ${activeProjects}`,
      `Outstanding INR: ${outstanding / 100}`,
      `Pending invoices: ${inv.pending ?? 0}`,
      `Days since last contact: ${daysSince ?? 'unknown'}`,
      `Notes: ${client.notes ?? ''}`,
    ].join('\n')

    const summary = await complete(
      'You are a client success advisor for a software agency. Return sections: Client Health (1 sentence), Revenue Summary (bullets), Pending Payments, Open Projects, Risk Alerts, Recommended Actions (numbered). Be specific with INR amounts when provided.',
      context,
    )
    res.json({
      summary,
      health_score: computeHealthFromContext(outstanding, activeProjects, daysSince, Number(inv.pending ?? 0)),
      outstanding_cents: outstanding,
      active_projects: activeProjects,
      pending_invoices: Number(inv.pending ?? 0),
      days_since_contact: daysSince,
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

function computeHealthFromContext(
  outstandingCents: number,
  activeProjects: number,
  daysSinceContact: number | null,
  invoicesPending: number,
): number {
  let score = 100
  if (outstandingCents > 5000000) score -= 20
  else if (outstandingCents > 0) score -= 10
  if (daysSinceContact === null || daysSinceContact > 14) score -= 20
  else if (daysSinceContact > 7) score -= 10
  if (invoicesPending >= 2) score -= 10
  if (activeProjects === 0) score -= 5
  return Math.max(0, Math.min(100, score))
}

router.post('/project-report', async (req, res) => {
  try {
    const { project_id } = req.body
    const { analyzeProject } = await import('../services/projectIntelligence.js')
    const row = await analyzeProject(String(project_id), req.auth?.sub)
    if (!row) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const intel = typeof row.ai_intelligence === 'object' ? row.ai_intelligence : {}
    const report = [
      `Project Health: ${(intel as { project_health?: string }).project_health ?? 'Good'}`,
      `Timeline Risk: ${(intel as { timeline_risk?: string }).timeline_risk ?? 'Low'}`,
      `Budget Risk: ${(intel as { budget_risk?: string }).budget_risk ?? 'Low'}`,
      `Current Bottleneck: ${(intel as { current_bottleneck?: string }).current_bottleneck ?? 'None'}`,
      `Recommended Action: ${(intel as { recommended_action?: string }).recommended_action ?? 'Continue sprint'}`,
      `Predicted Completion: ${(intel as { predicted_completion?: string }).predicted_completion ?? 'TBD'}`,
      '',
      (intel as { ai_summary?: string }).ai_summary ?? '',
    ].join('\n')
    res.json({ report, intelligence: intel })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/close-probability', async (req, res) => {
  try {
    const { lead_id } = req.body
    const lead = firstRow<{ name: string; status: string; budget: string; timeline: string; deal_value_cents: number; priority: string }>(
      await sql`SELECT name, status, budget, timeline, deal_value_cents, priority FROM crm_leads WHERE id = ${lead_id}::uuid`
    )
    if (!lead) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const analysis = await complete(
      'Estimate deal close probability 0-100 with 2-sentence rationale for a B2B services sale.',
      JSON.stringify(lead)
    )
    res.json({ analysis })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/summarize-lead', async (req, res) => {
  try {
    const { lead_id } = req.body
    const lead = firstRow<Record<string, unknown>>(
      await sql`SELECT name, company, email, status, budget, timeline, deal_value_cents, priority, requirements, message, project_type FROM crm_leads WHERE id = ${lead_id}::uuid`
    )
    if (!lead) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const summary = await complete(
      'Summarize this sales lead in 3-4 bullet points for a founder. Focus on opportunity, budget, urgency, and next step.',
      JSON.stringify(lead)
    )
    res.json({ summary })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/meeting-questions', async (req, res) => {
  try {
    const { lead_id } = req.body
    const lead = firstRow<Record<string, unknown>>(
      await sql`SELECT name, company, project_type, budget, timeline, requirements, message FROM crm_leads WHERE id = ${lead_id}::uuid`
    )
    if (!lead) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const questions = await complete(
      'Generate 6 discovery call questions for a software agency sales call. Return numbered list only.',
      JSON.stringify(lead)
    )
    res.json({ questions })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/payment-reminder', async (req, res) => {
  try {
    const { invoice_id, client_id, channel } = req.body

    let inv = invoice_id
      ? firstRow<{ invoice_number: string; total_cents: number; amount_cents: number; status: string; client_id: string; payment_link: string | null }>(
          await sql`SELECT invoice_number, total_cents, amount_cents, status, client_id::text, payment_link FROM invoices WHERE id = ${invoice_id}::uuid`,
        )
      : null

    if (!inv && client_id) {
      const result = await pool.query(
        `SELECT invoice_number, COALESCE(total_cents, amount_cents, 0) AS total_cents, amount_cents, status, client_id::text, payment_link
         FROM invoices
         WHERE client_id = $1::uuid AND status NOT IN ('paid', 'cancelled')
         ORDER BY due_at ASC NULLS LAST, "createdAt" ASC
         LIMIT 1`,
        [client_id],
      )
      inv = result.rows[0] as typeof inv
    }

    if (!inv) {
      res.status(404).json({ error: 'No pending invoice found' })
      return
    }

    const client = client_id
      ? firstRow<{ name: string }>(await sql`SELECT name FROM clients WHERE id = ${client_id}::uuid`)
      : firstRow<{ name: string }>(await sql`SELECT name FROM clients WHERE id = ${inv.client_id}::uuid`)

    const amount = Number(inv.total_cents ?? inv.amount_cents ?? 0) / 100
    const linkLine = inv.payment_link ? `\nPayment link: ${inv.payment_link}` : ''
    const format = channel === 'whatsapp'
      ? 'Write a short polite WhatsApp payment reminder. No subject line.'
      : channel === 'sms'
        ? 'Write a concise SMS payment reminder under 160 characters.'
        : 'Write a polite payment reminder email. Subject line first with "Subject: " prefix.'

    const draft = await complete(
      format,
      `Client: ${client?.name ?? 'Client'}\nInvoice ${inv.invoice_number}, amount ₹${amount} INR, status ${inv.status}${linkLine}\nInclude a polite call-to-action to pay via the payment link if available.`,
    )
    res.json({ draft, message: draft, channel: channel ?? 'email', invoice_number: inv.invoice_number })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

const EXPENSE_CATEGORIES = [
  'software',
  'marketing',
  'payroll',
  'travel',
  'operations',
  'office',
  'utilities',
  'taxes',
  'general',
  'other',
]

router.post('/scan-receipt', async (req, res) => {
  try {
    const { image_base64, receipt_text } = req.body as { image_base64?: string; receipt_text?: string }
    if (!image_base64 && !receipt_text) {
      res.status(400).json({ error: 'Provide image_base64 or receipt_text' })
      return
    }

    const system = `You extract expense data from receipts. Return ONLY valid JSON with keys:
description (string), vendor (string|null), amount_cents (integer, INR paise = rupees * 100),
category (one of: ${EXPENSE_CATEGORIES.join(', ')}), expense_date (YYYY-MM-DD or null), gst_cents (integer|null).
Use category "software" for SaaS/tools, "marketing" for ads, "office" for supplies.`

    let raw = ''
    if (image_base64 && openai) {
      const dataUrl = image_base64.startsWith('data:') ? image_base64 : `data:image/jpeg;base64,${image_base64}`
      const vision = await openai.chat.completions.create({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract expense fields from this receipt image.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
      })
      raw = vision.choices[0]?.message?.content?.trim() ?? ''
    } else {
      raw = await complete(system, receipt_text ?? '')
    }

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as Record<string, unknown>) : {}
    const amountCents = Number(parsed.amount_cents ?? 0)
    const category = EXPENSE_CATEGORIES.includes(String(parsed.category)) ? String(parsed.category) : 'general'

    res.json({
      description: String(parsed.description ?? parsed.vendor ?? 'Expense'),
      vendor: parsed.vendor ? String(parsed.vendor) : null,
      amount_cents: Number.isFinite(amountCents) ? amountCents : 0,
      category,
      expense_date: parsed.expense_date ? String(parsed.expense_date) : new Date().toISOString().slice(0, 10),
      gst_cents: parsed.gst_cents != null ? Number(parsed.gst_cents) : null,
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
