import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import { pool } from '../../../db.js'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'
import { runCurvvtechWorkflows } from '../services/workflowRunner.js'
import { CONSULTING_PROPOSAL_SECTIONS, runConsultingProposalEngine, consultingResultToMetadata } from '../services/proposalEngine.js'

const router = Router()
router.use(requireCurvvtechAdmin)

const PROPOSAL_SECTIONS = CONSULTING_PROPOSAL_SECTIONS.map((s) => ({ ...s }))

const STATUS_PROBABILITY: Record<string, number> = {
  new: 10,
  qualified: 25,
  discovery_call: 40,
  proposal_sent: 55,
  negotiation: 75,
  won: 100,
  lost: 0,
}

function computeLeadScore(lead: Record<string, unknown>): number {
  let score = 20
  const deal = Number(lead.deal_value_cents ?? 0)
  if (deal >= 5000000) score += 25
  else if (deal >= 2000000) score += 18
  else if (deal >= 500000) score += 12
  else if (deal > 0) score += 6

  const priority = String(lead.priority ?? 'medium')
  if (priority === 'high') score += 15
  else if (priority === 'medium') score += 8

  if (lead.budget) score += 8
  if (lead.timeline) score += 5
  if (lead.email) score += 4
  if (lead.phone) score += 4
  if (lead.company) score += 4
  if (lead.requirements || lead.message) score += 5

  const status = String(lead.status ?? 'new')
  score += STATUS_PROBABILITY[status] ? Math.round(STATUS_PROBABILITY[status]! * 0.15) : 0

  const ref = lead.last_contacted_at ?? lead.updatedAt ?? lead.createdAt
  if (ref) {
    const days = (Date.now() - new Date(String(ref)).getTime()) / (1000 * 60 * 60 * 24)
    if (days <= 2) score += 10
    else if (days <= 7) score += 5
    else if (days > 14) score -= 8
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

function scoreTier(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 75) return 'hot'
  if (score >= 45) return 'warm'
  return 'cold'
}

async function logLeadActivity(
  leadId: string,
  action: string,
  message: string,
  clerkUserId?: string | null,
  extra?: Record<string, unknown>,
) {
  await sql`
    INSERT INTO activity_logs (clerk_user_id, action, entity_type, entity_id, details)
    VALUES (
      ${clerkUserId ?? null},
      ${action},
      'lead',
      ${leadId},
      ${JSON.stringify({ message, ...extra })}::jsonb
    )
  `
}

export async function convertLeadToClient(leadId: string, clerkUserId?: string | null) {
  const lead = firstRow<Record<string, unknown>>(
    await sql`SELECT * FROM crm_leads WHERE id = ${leadId}::uuid`,
  )
  if (!lead) return null
  if (lead.converted_client_id) {
    return {
      client_id: String(lead.converted_client_id),
      project_id: lead.converted_project_id ? String(lead.converted_project_id) : null,
      already: true,
    }
  }

  const client = firstRow<{ id: string }>(await sql`
    INSERT INTO clients (name, email, company, contract_value_cents, status, notes, "updatedAt", "createdAt")
    VALUES (
      ${String(lead.name ?? lead.company ?? 'Client')},
      ${lead.email ?? null},
      ${lead.company ?? null},
      ${lead.deal_value_cents ?? null},
      'active',
      ${lead.requirements ?? lead.message ?? null},
      NOW(), NOW()
    )
    RETURNING id::text AS id
  `)

  const projectName = lead.project_type
    ? `${lead.project_type}${lead.company ? ` — ${lead.company}` : ''}`
    : `${lead.company ?? lead.name ?? 'Client'} Project`

  const project = firstRow<{ id: string }>(await sql`
    INSERT INTO projects (client_id, name, status, progress_pct, internal_notes, budget_cents, "updatedAt", "createdAt")
    VALUES (
      ${client!.id}::uuid,
      ${projectName},
      'planning',
      0,
      ${lead.requirements ?? lead.message ?? null},
      ${lead.deal_value_cents ?? null},
      NOW(), NOW()
    )
    RETURNING id::text AS id
  `)

  await sql`
    UPDATE crm_leads SET
      converted_client_id = ${client!.id}::uuid,
      converted_project_id = ${project!.id}::uuid,
      status = 'won',
      probability = 100,
      "updatedAt" = NOW()
    WHERE id = ${leadId}::uuid
  `

  await logLeadActivity(
    leadId,
    'client_created',
    `Client and project created from won lead`,
    clerkUserId,
    { client_id: client!.id, project_id: project!.id },
  )

  return { client_id: client!.id, project_id: project!.id, already: false }
}

router.get('/pipeline-summary', async (_req, res) => {
  try {
    const row = firstRow(await sql`
      SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('won', 'lost'))::int AS total_leads,
        COALESCE(SUM(deal_value_cents) FILTER (WHERE status NOT IN ('won', 'lost')), 0)::bigint AS pipeline_value_cents,
        COALESCE(SUM(deal_value_cents) FILTER (
          WHERE status = 'won' AND "updatedAt" >= date_trunc('month', NOW())
        ), 0)::bigint AS won_this_month_cents,
        COUNT(*) FILTER (WHERE status = 'won')::int AS won_count,
        COUNT(*) FILTER (WHERE status = 'lost')::int AS lost_count
      FROM crm_leads
    `) as Record<string, unknown>

    const won = Number(row.won_count ?? 0)
    const lost = Number(row.lost_count ?? 0)
    const closed = won + lost

    res.json({
      total_leads: Number(row.total_leads ?? 0),
      pipeline_value_cents: Number(row.pipeline_value_cents ?? 0),
      won_this_month_cents: Number(row.won_this_month_cents ?? 0),
      conversion_rate_pct: closed > 0 ? Math.round((won / closed) * 100) : 0,
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/', async (req, res) => {
  try {
    const status = req.query.status as string | undefined
    const assignedTo = req.query.assigned_to as string | undefined
    const priority = req.query.priority as string | undefined
    const source = req.query.source as string | undefined
    const projectType = req.query.project_type as string | undefined
    const budgetMin = req.query.budget_min ? Number(req.query.budget_min) : undefined
    const budgetMax = req.query.budget_max ? Number(req.query.budget_max) : undefined

    const clauses: string[] = []
    const params: unknown[] = []

    if (status) {
      params.push(status)
      clauses.push(`status = $${params.length}`)
    }
    if (assignedTo) {
      params.push(assignedTo)
      clauses.push(`assigned_to_clerk_id = $${params.length}`)
    }
    if (priority) {
      params.push(priority)
      clauses.push(`priority = $${params.length}`)
    }
    if (source) {
      params.push(source)
      clauses.push(`source = $${params.length}`)
    }
    if (projectType) {
      params.push(`%${projectType}%`)
      clauses.push(`project_type ILIKE $${params.length}`)
    }
    if (budgetMin !== undefined && !Number.isNaN(budgetMin)) {
      params.push(budgetMin)
      clauses.push(`deal_value_cents >= $${params.length}`)
    }
    if (budgetMax !== undefined && !Number.isNaN(budgetMax)) {
      params.push(budgetMax)
      clauses.push(`deal_value_cents <= $${params.length}`)
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const result = await pool.query(
      `SELECT * FROM crm_leads ${where} ORDER BY "updatedAt" DESC`,
      params,
    )
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/', async (req, res) => {
  try {
    const auth = req.auth!
    const {
      source, name, email, phone, company, message, status,
      budget, timeline, deal_value_cents, priority, project_type, tags,
      assigned_to_clerk_id, expected_close_date, requirements,
    } = req.body

    const reqText = requirements ?? message ?? null
    const dealCents = deal_value_cents ?? (budget ? parseBudgetToCents(String(budget)) : null)
    const prob = STATUS_PROBABILITY[String(status ?? 'new')] ?? 10

    const result = await sql`
      INSERT INTO crm_leads (
        source, name, email, phone, company, message, status,
        budget, timeline, deal_value_cents, priority, project_type, tags,
        assigned_to_clerk_id, expected_close_date, requirements, probability, score
      )
      VALUES (
        ${source ?? 'manual'}, ${name ?? null}, ${email ?? null}, ${phone ?? null},
        ${company ?? null}, ${reqText}, ${status ?? 'new'},
        ${budget ?? null}, ${timeline ?? null}, ${dealCents},
        ${priority ?? 'medium'}, ${project_type ?? null},
        ${Array.isArray(tags) ? tags : []},
        ${assigned_to_clerk_id ?? null},
        ${expected_close_date ?? null},
        ${reqText},
        ${prob},
        0
      )
      RETURNING *
    `
    const row = firstRow(result)! as Record<string, unknown>
    const score = computeLeadScore(row)
    await sql`UPDATE crm_leads SET score = ${score}, probability = ${STATUS_PROBABILITY[String(row.status ?? 'new')] ?? prob} WHERE id = ${String(row.id)}::uuid`
    await logLeadActivity(String(row.id), 'lead_created', 'Lead created', auth.sub)
    if (reqText) {
      await sql`
        INSERT INTO crm_lead_notes (lead_id, author_clerk_id, body, is_internal)
        VALUES (${String(row.id)}::uuid, ${auth.sub}, ${reqText}, true)
      `
    }
    const updated = firstRow(await sql`SELECT * FROM crm_leads WHERE id = ${String(row.id)}::uuid`)
    res.status(201).json(updated)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

function parseBudgetToCents(budget: string): number | null {
  const n = Number(budget.replace(/[^\d.]/g, ''))
  if (!n || Number.isNaN(n)) return null
  return Math.round(n * 100)
}

router.get('/:id/ai-insights', async (req, res) => {
  try {
    const lead = firstRow<Record<string, unknown>>(
      await sql`SELECT * FROM crm_leads WHERE id = ${req.params.id}::uuid`,
    )
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' })
      return
    }

    const score = Number(lead.score ?? computeLeadScore(lead))
    const tier = scoreTier(score)
    const insights: string[] = []
    const actions: { label: string; href: string; kind: string }[] = []

    const lastTouch = lead.last_contacted_at ?? lead.updatedAt
    if (lastTouch) {
      const days = Math.floor((Date.now() - new Date(String(lastTouch)).getTime()) / (1000 * 60 * 60 * 24))
      if (days >= 5) {
        insights.push(`Lead has not been contacted in ${days} days.`)
        actions.push({ label: 'Send follow up', href: `/leads/${req.params.id}`, kind: 'follow_up' })
      }
    } else {
      insights.push('Lead has never been contacted.')
      actions.push({ label: 'Send follow up', href: `/leads/${req.params.id}`, kind: 'follow_up' })
    }

    const deal = Number(lead.deal_value_cents ?? 0)
    if (deal >= 5000000) {
      insights.push('High-value opportunity — prioritize personal outreach.')
    } else if (deal >= 800000) {
      insights.push('Budget aligns with typical ₹80k–₹1L+ projects.')
    }

    if (String(lead.status) === 'proposal_sent') {
      insights.push('Proposal is out — follow up if no client response in 3 days.')
    }

    if (!lead.converted_proposal_id && !['won', 'lost'].includes(String(lead.status))) {
      actions.push({
        label: 'Generate proposal',
        href: `/leads/${req.params.id}`,
        kind: 'generate_proposal',
      })
    }

    actions.push({ label: 'Schedule call', href: `/leads/${req.params.id}`, kind: 'schedule_call' })

    if (insights.length === 0) {
      insights.push('Lead profile looks complete — keep momentum with the next pipeline step.')
    }

    res.json({
      score,
      tier,
      probability: Number(lead.probability ?? STATUS_PROBABILITY[String(lead.status ?? 'new')] ?? 0),
      insights: insights.slice(0, 4),
      recommended_actions: actions.slice(0, 4),
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/generate-proposal', async (req, res) => {
  try {
    const auth = req.auth!
    const leadId = req.params.id
    const lead = firstRow<Record<string, unknown>>(await sql`SELECT * FROM crm_leads WHERE id = ${leadId}::uuid`)
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' })
      return
    }

    const existing = firstRow<{ id: string }>(
      await sql`SELECT id::text AS id FROM proposals WHERE lead_id = ${leadId}::uuid ORDER BY "createdAt" DESC LIMIT 1`,
    )
    if (existing) {
      res.json({ proposal_id: existing.id, existing: true })
      return
    }

    const title = `${lead.company ?? lead.name ?? 'Client'} — ${lead.project_type ?? 'Proposal'}`
    const shareToken = randomBytes(16).toString('hex')
    const dealCents = Number(lead.deal_value_cents ?? 0)
    const metaJson = JSON.stringify({
      line_items: [
        { id: '1', description: 'Design', qty: 1, amount_cents: Math.round(dealCents * 0.45) },
        { id: '2', description: 'Development', qty: 1, amount_cents: Math.round(dealCents * 0.45) },
        { id: '3', description: 'Premium animations', qty: 1, amount_cents: Math.round(dealCents * 0.1) },
      ],
      payment_milestones: [
        { id: '1', label: '50% Advance', percent: 50 },
        { id: '2', label: '30% Testing', percent: 30 },
        { id: '3', label: '20% Delivery', percent: 20 },
      ],
      timeline_milestones: [
        { id: '1', title: 'Discovery', duration: 'Week 1' },
        { id: '2', title: 'Design', duration: 'Week 2' },
        { id: '3', title: 'Development', duration: 'Week 3–4' },
        { id: '4', title: 'Testing', duration: 'Week 5' },
        { id: '5', title: 'Launch', duration: 'Week 6' },
      ],
    })
    const proposal = firstRow<{ id: string }>(await sql`
      INSERT INTO proposals (
        title, client_name, lead_id, share_token, total_cents, created_by_user_id,
        owner_user_id, project_type, metadata_json
      )
      VALUES (
        ${title},
        ${lead.company ?? lead.name ?? null},
        ${leadId}::uuid,
        ${shareToken},
        ${dealCents},
        ${auth.sub},
        ${auth.sub},
        ${lead.project_type ?? null},
        ${metaJson}::jsonb
      )
      RETURNING id::text AS id
    `)

    for (let i = 0; i < PROPOSAL_SECTIONS.length; i++) {
      const s = PROPOSAL_SECTIONS[i]!
      await sql`
        INSERT INTO proposal_sections (proposal_id, sort_order, section_key, title, content, block_type)
        VALUES (${proposal!.id}::uuid, ${i}, ${s.section_key}, ${s.title}, ${s.content}, ${s.block_type})
      `
    }

    const skipAi = req.body?.skip_ai === true
    if (!skipAi && process.env.OPENAI_API_KEY) {
      const aiResult = await runConsultingProposalEngine({
        title,
        client_name: lead.company ? String(lead.company) : lead.name ? String(lead.name) : null,
        project_type: lead.project_type ? String(lead.project_type) : null,
        total_cents: dealCents,
        lead_name: lead.name ? String(lead.name) : null,
        lead_company: lead.company ? String(lead.company) : null,
        requirements: lead.requirements ? String(lead.requirements) : null,
        message: lead.message ? String(lead.message) : null,
        budget: lead.budget ? String(lead.budget) : null,
        timeline: lead.timeline ? String(lead.timeline) : null,
        deal_value_cents: dealCents,
        source: lead.source ? String(lead.source) : null,
        tags: Array.isArray(lead.tags) ? (lead.tags as string[]) : null,
      })
      if (aiResult) {
        const { metadata_json, total_cents, sectionContent } = consultingResultToMetadata(aiResult, proposal!.id)
        await sql`
          UPDATE proposals SET total_cents = ${total_cents}, metadata_json = ${JSON.stringify(metadata_json)}::jsonb
          WHERE id = ${proposal!.id}::uuid
        `
        for (const [key, content] of Object.entries(sectionContent)) {
          await sql`
            UPDATE proposal_sections SET content = ${content}
            WHERE proposal_id = ${proposal!.id}::uuid AND section_key = ${key}
          `
        }
      }
    }

    const newStatus = ['won', 'lost'].includes(String(lead.status)) ? String(lead.status) : 'proposal_sent'
    await sql`
      UPDATE crm_leads SET
        converted_proposal_id = ${proposal!.id}::uuid,
        status = ${newStatus},
        probability = ${STATUS_PROBABILITY[newStatus] ?? 55},
        "updatedAt" = NOW()
      WHERE id = ${leadId}::uuid
    `

    const updatedLead = firstRow(await sql`SELECT * FROM crm_leads WHERE id = ${leadId}::uuid`)
    const score = computeLeadScore(updatedLead as Record<string, unknown>)
    await sql`UPDATE crm_leads SET score = ${score} WHERE id = ${leadId}::uuid`

    await logLeadActivity(leadId, 'proposal_generated', `Proposal created: ${title}`, auth.sub, {
      proposal_id: proposal!.id,
    })

    res.status(201).json({ proposal_id: proposal!.id, existing: false })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/convert-to-client', async (req, res) => {
  try {
    const result = await convertLeadToClient(req.params.id, req.auth?.sub)
    if (!result) {
      res.status(404).json({ error: 'Lead not found' })
      return
    }
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/recalculate-score', async (req, res) => {
  try {
    const lead = firstRow<Record<string, unknown>>(
      await sql`SELECT * FROM crm_leads WHERE id = ${req.params.id}::uuid`,
    )
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' })
      return
    }
    const score = computeLeadScore(lead)
    const probability = STATUS_PROBABILITY[String(lead.status ?? 'new')] ?? Number(lead.probability ?? 0)
    await sql`UPDATE crm_leads SET score = ${score}, probability = ${probability}, "updatedAt" = NOW() WHERE id = ${req.params.id}::uuid`
    res.json({ score, tier: scoreTier(score), probability })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/timeline', async (req, res) => {
  try {
    const id = req.params.id
    const lead = firstRow<{ createdAt: string; status: string }>(
      await sql`SELECT "createdAt", status FROM crm_leads WHERE id = ${id}::uuid`,
    )
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' })
      return
    }

    type TimelineItem = { id: string; type: string; message: string; created_at: string; meta?: Record<string, unknown> }

    const events: TimelineItem[] = [
      {
        id: `created-${id}`,
        type: 'created',
        message: 'Lead created',
        created_at: String(lead.createdAt),
      },
    ]

    const proposals = (await sql`
      SELECT id::text, title, status, sent_at, viewed_at, approved_at, rejected_at, "createdAt"
      FROM proposals WHERE lead_id = ${id}::uuid ORDER BY "createdAt" ASC
    `) as Record<string, unknown>[]

    for (const p of proposals) {
      events.push({
        id: `proposal-${p.id}`,
        type: 'proposal',
        message: `Proposal created: ${p.title ?? 'Untitled'}`,
        created_at: String(p.createdAt),
        meta: { proposal_id: p.id, status: p.status },
      })
      if (p.sent_at) {
        events.push({
          id: `proposal-sent-${p.id}`,
          type: 'proposal_sent',
          message: 'Proposal sent to client',
          created_at: String(p.sent_at),
        })
      }
      if (p.viewed_at) {
        events.push({
          id: `proposal-viewed-${p.id}`,
          type: 'proposal_viewed',
          message: 'Client viewed proposal',
          created_at: String(p.viewed_at),
        })
      }
      if (p.approved_at) {
        events.push({
          id: `proposal-approved-${p.id}`,
          type: 'proposal_approved',
          message: 'Proposal approved',
          created_at: String(p.approved_at),
        })
      }
      if (p.rejected_at) {
        events.push({
          id: `proposal-rejected-${p.id}`,
          type: 'proposal_rejected',
          message: 'Proposal rejected',
          created_at: String(p.rejected_at),
        })
      }
    }

    events.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    res.json(events)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/activity', async (req, res) => {
  try {
    const id = req.params.id
    const lead = firstRow(await sql`SELECT id::text FROM crm_leads WHERE id = ${id}::uuid`)
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' })
      return
    }

    const rows = await sql`
      SELECT al.id::text, al.action AS type,
        COALESCE(al.details->>'message', al.action) AS message,
        al.clerk_user_id,
        u.email AS author_email,
        al.details,
        al."createdAt" AS created_at
      FROM activity_logs al
      LEFT JOIN users u ON u.id::text = al.clerk_user_id
      WHERE al.entity_type = 'lead' AND al.entity_id = ${id}
      ORDER BY al."createdAt" DESC
      LIMIT 100
    `
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/notes', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM crm_lead_notes WHERE lead_id = ${req.params.id}::uuid ORDER BY "createdAt" DESC`
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/notes', async (req, res) => {
  try {
    const auth = req.auth!
    const { body: noteBody, is_internal } = req.body

    const row = firstRow(await sql`
      INSERT INTO crm_lead_notes (lead_id, author_clerk_id, body, is_internal)
      VALUES (${req.params.id}::uuid, ${auth.sub}, ${noteBody ?? ''}, ${is_internal !== false})
      RETURNING *
    `)
    await sql`UPDATE crm_leads SET last_contacted_at = NOW(), "updatedAt" = NOW() WHERE id = ${req.params.id}::uuid`
    await logLeadActivity(req.params.id, 'note_added', 'Note added', auth.sub)
    res.status(201).json(row!)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const row = firstRow(await sql`SELECT * FROM crm_leads WHERE id = ${req.params.id}::uuid`)
    if (!row) {
      res.status(404).json({ error: 'Lead not found' })
      return
    }
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const body = req.body
    const auth = req.auth!

    const existing = firstRow<{ id: string; status: string; converted_client_id: string | null }>(
      await sql`SELECT id::text AS id, status, converted_client_id::text FROM crm_leads WHERE id = ${id}::uuid`,
    )
    if (!existing) {
      res.status(404).json({ error: 'Lead not found' })
      return
    }

    if (body.status !== undefined) await sql`UPDATE crm_leads SET status = ${body.status}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.assigned_to_clerk_id !== undefined) await sql`UPDATE crm_leads SET assigned_to_clerk_id = ${body.assigned_to_clerk_id}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.name !== undefined) await sql`UPDATE crm_leads SET name = ${body.name}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.email !== undefined) await sql`UPDATE crm_leads SET email = ${body.email}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.phone !== undefined) await sql`UPDATE crm_leads SET phone = ${body.phone}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.company !== undefined) await sql`UPDATE crm_leads SET company = ${body.company}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.message !== undefined) await sql`UPDATE crm_leads SET message = ${body.message}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.source !== undefined) await sql`UPDATE crm_leads SET source = ${body.source}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.budget !== undefined) await sql`UPDATE crm_leads SET budget = ${body.budget}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.timeline !== undefined) await sql`UPDATE crm_leads SET timeline = ${body.timeline}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.deal_value_cents !== undefined) await sql`UPDATE crm_leads SET deal_value_cents = ${body.deal_value_cents}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.priority !== undefined) await sql`UPDATE crm_leads SET priority = ${body.priority}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.project_type !== undefined) await sql`UPDATE crm_leads SET project_type = ${body.project_type}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.tags !== undefined) await sql`UPDATE crm_leads SET tags = ${Array.isArray(body.tags) ? body.tags : []}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.score !== undefined) await sql`UPDATE crm_leads SET score = ${Number(body.score)}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.next_follow_up_at !== undefined) await sql`UPDATE crm_leads SET next_follow_up_at = ${body.next_follow_up_at}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.expected_close_date !== undefined) await sql`UPDATE crm_leads SET expected_close_date = ${body.expected_close_date}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.requirements !== undefined) await sql`UPDATE crm_leads SET requirements = ${body.requirements}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.probability !== undefined) await sql`UPDATE crm_leads SET probability = ${Number(body.probability)}, "updatedAt" = NOW() WHERE id = ${id}::uuid`
    if (body.last_contacted_at !== undefined) await sql`UPDATE crm_leads SET last_contacted_at = ${body.last_contacted_at}, "updatedAt" = NOW() WHERE id = ${id}::uuid`

    if (body.status !== undefined && body.status !== existing.status) {
      await sql`UPDATE crm_leads SET last_contacted_at = NOW() WHERE id = ${id}::uuid`
      await sql`UPDATE crm_leads SET probability = ${STATUS_PROBABILITY[String(body.status)] ?? 0} WHERE id = ${id}::uuid`
      await logLeadActivity(
        id,
        'status_change',
        `Status changed to ${String(body.status).replace(/_/g, ' ')}`,
        auth.sub,
        { from: existing.status, to: body.status },
      )
      void runCurvvtechWorkflows({
        trigger_type: 'lead_status_change',
        entity_type: 'lead',
        entity_id: id,
        payload: { status: body.status, previous: existing.status },
      })

      if (body.status === 'won' && !existing.converted_client_id) {
        await convertLeadToClient(id, auth.sub)
      }
    }

    const row = firstRow<Record<string, unknown>>(await sql`SELECT * FROM crm_leads WHERE id = ${id}::uuid`)
    if (row) {
      const score = computeLeadScore(row)
      await sql`UPDATE crm_leads SET score = ${score} WHERE id = ${id}::uuid`
    }
    const final = firstRow(await sql`SELECT * FROM crm_leads WHERE id = ${id}::uuid`)
    res.json(final)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
