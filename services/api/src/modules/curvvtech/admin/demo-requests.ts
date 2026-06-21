import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import { DemoMailConfigurationError } from '../../demo/demoCalendarMail.js'
import {
  DemoStatusTransitionError,
  updateDemoRequestStatus,
} from '../../demo/demo.service.js'
import {
  analyzeDemoRequest,
  analyzePendingDemos,
  generateDemoFollowUp,
  getDemoRequestIntel,
  listDemoRequestsIntel,
  runDemoAiAction,
  score100FromRow,
  type DemoRequestIntelRow,
} from '../../demo/demoIntelligence.js'
import { listInboundActivity, logInboundActivity } from '../../demo/inboundActivity.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { CONSULTING_PROPOSAL_SECTIONS, runConsultingProposalEngine, consultingResultToMetadata } from '../services/proposalEngine.js'

const router = Router()
router.use(requireCurvvtechAdmin)

const STATUSES = ['pending', 'confirmed', 'completed'] as const
const SALES_STAGES = ['new', 'qualified', 'discovery_scheduled', 'proposal_sent', 'negotiation', 'won', 'lost'] as const
const PROPOSAL_SECTIONS = CONSULTING_PROPOSAL_SECTIONS.map((s) => ({ ...s }))

function displayStatus(row: DemoRequestIntelRow): string {
  if (row.sales_stage && row.sales_stage !== 'new') return row.sales_stage
  if (row.converted_lead_id) return 'qualified'
  if (row.status === 'confirmed') return 'discovery_scheduled'
  return row.sales_stage ?? 'new'
}

router.get('/pipeline-summary', async (_req, res) => {
  try {
    const rows = await listDemoRequestsIntel()
    const open = rows.filter((r) => !['won', 'lost'].includes(String(r.sales_stage ?? 'new')))
    const pending = rows.filter((r) => (r.sales_stage ?? 'new') === 'new' && !r.converted_lead_id).length
    const qualified = rows.filter((r) => ['qualified', 'discovery_scheduled'].includes(String(r.sales_stage))).length
    const converted = rows.filter((r) => Boolean(r.converted_lead_id)).length
    const totalValue = open.reduce((s, r) => s + Number(r.deal_value_cents ?? 0), 0)
    const expectedRevenue = open.reduce((s, r) => {
      const cents = Number(r.deal_value_cents ?? 0)
      const prob = Number(r.close_probability ?? 25) / 100
      return s + Math.round(cents * prob)
    }, 0)
    const scored = rows.filter((r) => r.lead_score != null || r.ai_intelligence?.score_100)
    const avgScore = scored.length
      ? Math.round(scored.reduce((s, r) => s + score100FromRow(r), 0) / scored.length)
      : 0
    res.json({
      total: rows.length,
      pending,
      confirmed: qualified,
      converted,
      total_value_cents: totalValue,
      expected_revenue_cents: expectedRevenue,
      avg_score: avgScore,
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/analyze-pending', async (req, res) => {
  try {
    const limit = Math.min(20, Number(req.body?.limit ?? 10))
    const count = await analyzePendingDemos(limit)
    res.json({ analyzed: count })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/', async (_req, res) => {
  try {
    const rows = await listDemoRequestsIntel()
    res.json(rows.map((r) => ({ ...r, display_status: displayStatus(r) })))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await getDemoRequestIntel(req.params.id)
    if (!row) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json({ ...row, display_status: displayStatus(row) })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/activity', async (req, res) => {
  try {
    const rows = await listInboundActivity(req.params.id)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const auth = req.auth!
    const { id } = req.params
    const body = req.body ?? {}

    if (body.sales_stage !== undefined) {
      const stage = String(body.sales_stage).trim()
      if (!SALES_STAGES.includes(stage as (typeof SALES_STAGES)[number])) {
        res.status(400).json({ error: 'Invalid sales stage' })
        return
      }
      await sql`
        UPDATE demo_requests SET sales_stage = ${stage}, updated_at = NOW() WHERE id = ${id}::uuid
      `
      await logInboundActivity(id, 'stage_changed', `Stage → ${stage.replace(/_/g, ' ')}`, null, auth.sub, { sales_stage: stage })
    }

    if (body.status !== undefined) {
      const raw = typeof body.status === 'string' ? body.status.trim() : ''
      if (!STATUSES.includes(raw as (typeof STATUSES)[number])) {
        res.status(400).json({ error: 'Invalid status' })
        return
      }
      const row = await updateDemoRequestStatus(id, raw as (typeof STATUSES)[number])
      if (!row) {
        res.status(404).json({ error: 'Not found' })
        return
      }
      if (raw === 'confirmed') {
        await sql`UPDATE demo_requests SET sales_stage = 'discovery_scheduled', updated_at = NOW() WHERE id = ${id}::uuid`
        await logInboundActivity(id, 'discovery_scheduled', 'Discovery call scheduled', `${row.date} ${row.time}`, auth.sub)
      }
    }

    if (body.assigned_user_id !== undefined || body.requirements !== undefined || body.message !== undefined) {
      const prevAssigned = body.assigned_user_id !== undefined
      await sql`
        UPDATE demo_requests SET
          assigned_user_id = COALESCE(${body.assigned_user_id ?? null}, assigned_user_id),
          requirements = COALESCE(${body.requirements ?? null}, requirements),
          message = COALESCE(${body.message ?? null}, message),
          updated_at = NOW()
        WHERE id = ${id}::uuid
      `
      if (prevAssigned && body.assigned_user_id) {
        await logInboundActivity(id, 'assigned', 'Assigned to team member', null, auth.sub, { assigned_user_id: body.assigned_user_id })
      }
    }

    const updated = await getDemoRequestIntel(id)
    if (!updated) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json({ ...updated, display_status: displayStatus(updated) })
  } catch (e) {
    if (e instanceof DemoMailConfigurationError) {
      res.status(503).json({ error: e.message })
      return
    }
    if (e instanceof DemoStatusTransitionError) {
      res.status(400).json({ error: e.message })
      return
    }
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/analyze', async (req, res) => {
  try {
    const row = await analyzeDemoRequest(req.params.id, req.auth?.sub)
    if (!row) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json({ ...row, display_status: displayStatus(row) })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/follow-up', async (req, res) => {
  try {
    const tone = typeof req.body?.tone === 'string' ? req.body.tone : undefined
    const draft = await generateDemoFollowUp(req.params.id, tone)
    res.json({ draft })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/ai-action', async (req, res) => {
  try {
    const action = String(req.body?.action ?? 'summarize')
    const result = await runDemoAiAction(req.params.id, action)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

async function createLeadFromDemo(demo: DemoRequestIntelRow, authSub: string) {
  const intel = demo.ai_intelligence ?? {}
  const reqText =
    demo.requirements ??
    demo.message ??
    intel.requirements_summary ??
    `Demo booked for ${demo.date} at ${demo.time}`
  const dealCents = demo.deal_value_cents ?? intel.budget_max_cents ?? null
  const score100 = score100FromRow(demo)

  const lead = firstRow<{ id: string }>(await sql`
    INSERT INTO crm_leads (
      source, name, email, phone, company, message, status,
      budget, timeline, deal_value_cents, priority, project_type, tags,
      assigned_to_clerk_id, requirements, probability, score
    )
    VALUES (
      'demo',
      ${demo.name},
      ${demo.email},
      ${demo.phone},
      ${demo.company ?? intel.company ?? null},
      ${reqText},
      'new',
      ${demo.budget ?? intel.budget_range ?? null},
      ${demo.timeline ?? intel.timeline ?? null},
      ${dealCents},
      ${score100 >= 75 ? 'high' : score100 >= 45 ? 'medium' : 'low'},
      ${demo.project_type ?? intel.project_type ?? null},
      ${['inbound', 'demo']},
      ${demo.assigned_user_id ?? authSub},
      ${reqText},
      ${demo.close_probability ?? intel.close_probability ?? 25},
      ${score100}
    )
    RETURNING id::text AS id
  `)

  await sql`
    INSERT INTO activity_logs (clerk_user_id, action, entity_type, entity_id, details)
    VALUES (
      ${authSub},
      'lead_created',
      'lead',
      ${lead!.id},
      ${JSON.stringify({ message: 'Created from inbound opportunity', demo_request_id: demo.id })}::jsonb
    )
  `

  if (intel.ai_summary) {
    await sql`
      INSERT INTO crm_lead_notes (lead_id, author_clerk_id, body, is_internal)
      VALUES (${lead!.id}::uuid, ${authSub}, ${intel.ai_summary}, true)
    `
  }

  return lead!.id
}

router.post('/:id/convert-to-lead', async (req, res) => {
  try {
    const auth = req.auth!
    const demo = await getDemoRequestIntel(req.params.id)
    if (!demo) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    if (demo.converted_lead_id) {
      res.json({ lead_id: demo.converted_lead_id, already: true })
      return
    }
    const leadId = await createLeadFromDemo(demo, auth.sub)
    await sql`UPDATE demo_requests SET converted_lead_id = ${leadId}::uuid, sales_stage = 'qualified', updated_at = NOW() WHERE id = ${demo.id}::uuid`
    await logInboundActivity(demo.id, 'lead_created', 'Lead created', null, auth.sub, { lead_id: leadId })
    res.json({ lead_id: leadId })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/convert-to-pipeline', async (req, res) => {
  try {
    const auth = req.auth!
    let demo = await getDemoRequestIntel(req.params.id)
    if (!demo) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    if (!demo.analyzed_at) {
      demo = (await analyzeDemoRequest(demo.id, auth.sub)) ?? demo
    }

    let leadId = demo.converted_lead_id
    if (!leadId) {
      leadId = await createLeadFromDemo(demo, auth.sub)
      await sql`UPDATE demo_requests SET converted_lead_id = ${leadId}::uuid, sales_stage = 'qualified' WHERE id = ${demo.id}::uuid`
      await logInboundActivity(demo.id, 'lead_created', 'Lead created', null, auth.sub, { lead_id: leadId })
    }

    let clientId = demo.converted_client_id
    if (!clientId) {
      const intel = demo.ai_intelligence ?? {}
      const client = firstRow<{ id: string }>(await sql`
        INSERT INTO clients (name, email, company, contract_value_cents, status, notes, "updatedAt", "createdAt")
        VALUES (
          ${demo.company ?? demo.name},
          ${demo.email},
          ${demo.company ?? null},
          ${demo.deal_value_cents ?? intel.budget_max_cents ?? null},
          'active',
          ${demo.requirements ?? intel.requirements_summary ?? null},
          NOW(), NOW()
        )
        RETURNING id::text AS id
      `)
      clientId = client!.id
      await sql`
        UPDATE demo_requests SET converted_client_id = ${clientId}::uuid, updated_at = NOW()
        WHERE id = ${demo.id}::uuid
      `
      await sql`
        UPDATE crm_leads SET converted_client_id = ${clientId}::uuid
        WHERE id = ${leadId}::uuid
      `
      await logInboundActivity(demo.id, 'client_created', 'Client record created', null, auth.sub, { client_id: clientId })
    }

    await sql`UPDATE demo_requests SET sales_stage = 'qualified', updated_at = NOW() WHERE id = ${demo.id}::uuid`
    await logInboundActivity(demo.id, 'opportunity_created', 'Opportunity created', 'Lead + client linked', auth.sub)

    res.json({ lead_id: leadId, client_id: clientId, opportunity_id: leadId })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/create-proposal', async (req, res) => {
  try {
    const auth = req.auth!
    let demo = await getDemoRequestIntel(req.params.id)
    if (!demo) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    let leadId = demo.converted_lead_id
    if (!leadId) {
      leadId = await createLeadFromDemo(demo, auth.sub)
      await sql`UPDATE demo_requests SET converted_lead_id = ${leadId}::uuid WHERE id = ${demo.id}::uuid`
    }

    const lead = firstRow<Record<string, unknown>>(await sql`SELECT * FROM crm_leads WHERE id = ${leadId}::uuid`)
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' })
      return
    }

    const existing = firstRow<{ id: string }>(
      await sql`SELECT id::text AS id FROM proposals WHERE lead_id = ${leadId}::uuid ORDER BY "createdAt" DESC LIMIT 1`,
    )
    if (existing) {
      res.json({ proposal_id: existing.id, lead_id: leadId, existing: true })
      return
    }

    const title = `${lead.company ?? lead.name ?? 'Client'} — ${lead.project_type ?? 'Proposal'}`
    const shareToken = randomBytes(16).toString('hex')
    const dealCents = Number(lead.deal_value_cents ?? demo.deal_value_cents ?? 0)
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
        ${lead.project_type ?? demo.project_type ?? null},
        '{}'::jsonb
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

    if (process.env.OPENAI_API_KEY) {
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
        source: 'demo',
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

    await sql`
      UPDATE crm_leads SET status = 'proposal_sent', converted_proposal_id = ${proposal!.id}::uuid
      WHERE id = ${leadId}::uuid AND status NOT IN ('won', 'lost')
    `
    await sql`UPDATE demo_requests SET sales_stage = 'proposal_sent', updated_at = NOW() WHERE id = ${demo.id}::uuid`
    await logInboundActivity(demo.id, 'proposal_generated', 'Proposal generated', title, auth.sub, { proposal_id: proposal!.id })

    res.json({ proposal_id: proposal!.id, lead_id: leadId })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
