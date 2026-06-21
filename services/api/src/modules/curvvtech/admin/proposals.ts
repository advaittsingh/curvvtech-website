import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import { pool } from '../../../db.js'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { requireCurvvtechAdmin } from '../../../middleware/requireCurvvtechAdmin.js'
import { CONSULTING_PROPOSAL_SECTIONS, runConsultingProposalEngine } from '../services/proposalEngine.js'
import { applyConsultingResult, normalizeProposalSections } from '../services/proposalApply.js'
import { buildProposalDocumentHtml } from '../services/proposalDocumentHtml.js'

export const DEFAULT_SECTIONS = CONSULTING_PROPOSAL_SECTIONS.map((s) => ({ ...s }))

const router = Router()
router.use(requireCurvvtechAdmin)

async function logEvent(proposalId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  await sql`
    INSERT INTO proposal_events (proposal_id, event_type, metadata)
    VALUES (${proposalId}::uuid, ${eventType}, ${JSON.stringify(metadata)}::jsonb)
  `
}

async function loadProposal(id: string): Promise<Record<string, unknown> | null> {
  const proposal = firstRow<Record<string, unknown>>(await sql`
    SELECT p.*,
      u.email AS owner_email,
      l.name AS lead_name,
      c.name AS linked_client_name
    FROM proposals p
    LEFT JOIN users u ON u.id::text = p.owner_user_id
    LEFT JOIN crm_leads l ON l.id = p.lead_id
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.id = ${id}::uuid
  `)
  if (!proposal) return null
  const sections = await sql`
    SELECT * FROM proposal_sections WHERE proposal_id = ${id}::uuid ORDER BY sort_order ASC
  `
  return { ...proposal, sections }
}

async function insertDefaultSections(proposalId: string, overrides?: Record<string, string>) {
  for (let i = 0; i < DEFAULT_SECTIONS.length; i++) {
    const s = DEFAULT_SECTIONS[i]!
    const content = overrides?.[s.section_key] ?? s.content
    await sql`
      INSERT INTO proposal_sections (proposal_id, sort_order, section_key, title, content, block_type)
      VALUES (${proposalId}::uuid, ${i}, ${s.section_key}, ${s.title}, ${content}, ${s.block_type})
    `
  }
}

router.get('/pipeline-summary', async (_req, res) => {
  try {
    const row = firstRow<Record<string, unknown>>(await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'draft')::int AS drafts,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
        COUNT(*) FILTER (WHERE status IN ('viewed', 'negotiation'))::int AS in_review,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
        COALESCE(SUM(total_cents), 0)::bigint AS proposal_value_cents
      FROM proposals
    `)
    res.json({
      total: Number(row?.total ?? 0),
      drafts: Number(row?.drafts ?? 0),
      sent: Number(row?.sent ?? 0),
      approved: Number(row?.approved ?? 0),
      rejected: Number(row?.rejected ?? 0),
      in_review: Number(row?.in_review ?? 0),
      proposal_value_cents: Number(row?.proposal_value_cents ?? 0),
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/templates', async (_req, res) => {
  try {
    const rows = await sql`SELECT * FROM proposal_templates ORDER BY name ASC`
    if ((rows as unknown[]).length > 0) {
      res.json(rows)
      return
    }
    res.json([
      { key: 'shopify', name: 'Shopify Website', project_type: 'Shopify Website' },
      { key: 'corporate', name: 'Corporate Website', project_type: 'Corporate Website' },
      { key: 'mobile_app', name: 'Mobile App', project_type: 'Mobile App' },
      { key: 'web_app', name: 'Web App', project_type: 'Web Application' },
      { key: 'ai_solution', name: 'AI Solution', project_type: 'AI Solution' },
      { key: 'maintenance', name: 'Maintenance Contract', project_type: 'Maintenance' },
    ])
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/', async (_req, res) => {
  try {
    const rows = await sql`SELECT * FROM proposals ORDER BY "updatedAt" DESC`
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/', async (req, res) => {
  try {
    const auth = req.auth!
    const { title, client_name, client_id, lead_id, template_key, project_type, total_cents } = req.body
    const shareToken = randomBytes(16).toString('hex')
    const meta = JSON.stringify({})
    const proposal = firstRow<{ id: string }>(await sql`
      INSERT INTO proposals (
        title, client_name, client_id, lead_id, share_token, created_by_user_id,
        owner_user_id, template_key, project_type, total_cents, metadata_json
      )
      VALUES (
        ${title ?? 'Untitled proposal'},
        ${client_name ?? null},
        ${client_id ?? null}::uuid,
        ${lead_id ?? null}::uuid,
        ${shareToken},
        ${auth.sub},
        ${auth.sub},
        ${template_key ?? null},
        ${project_type ?? null},
        ${total_cents ?? 0},
        ${meta}::jsonb
      )
      RETURNING id::text AS id
    `)
    await insertDefaultSections(proposal!.id as string)
    await logEvent(proposal!.id as string, 'created')
    res.status(201).json(await loadProposal(proposal!.id as string))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/from-template', async (req, res) => {
  try {
    const auth = req.auth!
    const { template_key, client_name, lead_id, client_id } = req.body
    const templates: Record<string, { title: string; project_type: string }> = {
      shopify: { title: 'Premium Shopify Store', project_type: 'Shopify Website' },
      corporate: { title: 'Corporate Website Proposal', project_type: 'Corporate Website' },
      mobile_app: { title: 'Mobile App Development', project_type: 'Mobile App' },
      web_app: { title: 'Web Application Proposal', project_type: 'Web Application' },
      smart_meter: { title: 'Smart Meter Solution', project_type: 'Smart Meter' },
      ai_solution: { title: 'AI Solution Proposal', project_type: 'AI Solution' },
      maintenance: { title: 'Monthly Maintenance Agreement', project_type: 'Maintenance' },
    }
    const t = templates[String(template_key)] ?? { title: 'New Proposal', project_type: 'Custom' }
    const shareToken = randomBytes(16).toString('hex')
    const proposal = firstRow<{ id: string }>(await sql`
      INSERT INTO proposals (
        title, client_name, client_id, lead_id, share_token, created_by_user_id,
        owner_user_id, template_key, project_type, metadata_json
      )
      VALUES (
        ${t.title},
        ${client_name ?? null},
        ${client_id ?? null}::uuid,
        ${lead_id ?? null}::uuid,
        ${shareToken},
        ${auth.sub},
        ${auth.sub},
        ${template_key ?? null},
        ${t.project_type},
        '{}'::jsonb
      )
      RETURNING id::text AS id
    `)
    await insertDefaultSections(proposal!.id as string, {
      executive_summary: `This proposal outlines a ${t.project_type.toLowerCase()} engagement tailored to ${client_name ?? 'your business'}.`,
    })
    await logEvent(proposal!.id as string, 'created', { template_key })
    res.status(201).json(await loadProposal(proposal!.id as string))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/events', async (req, res) => {
  try {
    const rows = await sql`
      SELECT id::text, event_type, metadata, "createdAt" AS created_at
      FROM proposal_events
      WHERE proposal_id = ${req.params.id}::uuid
      ORDER BY "createdAt" DESC
      LIMIT 50
    `
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/analytics', async (req, res) => {
  try {
    const id = req.params.id
    const proposal = firstRow<{ view_count: number; viewed_at: string | null; sent_at: string | null; approved_at: string | null }>(
      await sql`SELECT view_count, viewed_at, sent_at, approved_at FROM proposals WHERE id = ${id}::uuid`,
    )
    if (!proposal) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const events = firstRow<{ views: number; last_viewed: string | null }>(await sql`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'viewed')::int AS views,
        MAX("createdAt") FILTER (WHERE event_type = 'viewed') AS last_viewed
      FROM proposal_events WHERE proposal_id = ${id}::uuid
    `)
    res.json({
      view_count: Number(proposal.view_count ?? events?.views ?? 0),
      last_viewed_at: events?.last_viewed ?? proposal.viewed_at,
      sent_at: proposal.sent_at,
      approved_at: proposal.approved_at,
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/generate-consulting', async (req, res) => {
  try {
    const id = req.params.id
    const proposal = firstRow<Record<string, unknown>>(await sql`
      SELECT p.*, l.name AS lead_name, l.company AS lead_company, l.requirements, l.message,
        l.budget, l.timeline, l.deal_value_cents, l.source, l.tags
      FROM proposals p
      LEFT JOIN crm_leads l ON l.id = p.lead_id
      WHERE p.id = ${id}::uuid
    `)
    if (!proposal) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    const result = await runConsultingProposalEngine({
      title: String(proposal.title ?? ''),
      client_name: proposal.client_name ? String(proposal.client_name) : null,
      project_type: proposal.project_type ? String(proposal.project_type) : null,
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
    })

    if (!result) {
      res.status(503).json({ error: 'AI generation failed — check OPENAI_API_KEY and try again' })
      return
    }

    const updated = await applyConsultingResult(id, result)
    if (!updated) {
      res.status(500).json({ error: 'Failed to save generated proposal' })
      return
    }
    res.json({ ok: true, business_analysis: result.business_analysis, proposal: updated })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/share', async (req, res) => {
  try {
    const id = req.params.id
    const row = firstRow<{ share_token: string }>(await sql`
      UPDATE proposals SET status = 'sent', sent_at = COALESCE(sent_at, NOW()), "updatedAt" = NOW()
      WHERE id = ${id}::uuid
      RETURNING share_token
    `)
    if (!row) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    await logEvent(id, 'shared')
    res.json({ share_token: row.share_token })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/duplicate', async (req, res) => {
  try {
    const auth = req.auth!
    const source = await loadProposal(req.params.id)
    if (!source) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const shareToken = randomBytes(16).toString('hex')
    const proposal = firstRow<{ id: string }>(await sql`
      INSERT INTO proposals (
        title, client_name, client_id, lead_id, share_token, created_by_user_id,
        owner_user_id, project_type, total_cents, metadata_json, template_key, status
      )
      VALUES (
        ${`${source.title ?? 'Proposal'} (Copy)`},
        ${source.client_name ?? null},
        ${source.client_id ?? null}::uuid,
        ${source.lead_id ?? null}::uuid,
        ${shareToken},
        ${auth.sub},
        ${auth.sub},
        ${source.project_type ?? null},
        ${source.total_cents ?? 0},
        ${JSON.stringify(source.metadata_json ?? {})}::jsonb,
        ${source.template_key ?? null},
        'draft'
      )
      RETURNING id::text AS id
    `)
    const sections = (source.sections as Record<string, unknown>[]) ?? []
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i]!
      await sql`
        INSERT INTO proposal_sections (proposal_id, sort_order, section_key, title, content, block_type)
        VALUES (
          ${proposal!.id}::uuid, ${i},
          ${String(s.section_key ?? 'custom')},
          ${String(s.title ?? '')},
          ${String(s.content ?? '')},
          ${String(s.block_type ?? 'text')}
        )
      `
    }
    await logEvent(proposal!.id as string, 'created', { duplicated_from: req.params.id })
    res.status(201).json(await loadProposal(proposal!.id as string))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/convert-to-project', async (req, res) => {
  try {
    const auth = req.auth!
    const id = req.params.id
    const { finalizeApprovedProposal } = await import('../services/proposalFinalize.js')
    const result = await finalizeApprovedProposal(id, { clerkUserId: auth.sub })
    if (!result) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    await sql`UPDATE proposals SET status = 'converted', "updatedAt" = NOW() WHERE id = ${id}::uuid`
    await logEvent(id, 'converted', {
      client_id: result.client_id,
      project_id: result.project_id,
      invoice_ids: result.invoice_ids,
    })

    res.json(result)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/sync-sections', async (req, res) => {
  try {
    const id = req.params.id
    await normalizeProposalSections(id)
    const data = await loadProposal(id)
    if (!data) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id
    let data = await loadProposal(id)
    if (!data) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const sectionCount = Array.isArray(data.sections) ? (data.sections as unknown[]).length : 0
    const keys = new Set(
      ((data.sections as { section_key?: string }[]) ?? []).map((s) => s.section_key).filter(Boolean),
    )
    const needsNormalize =
      sectionCount !== CONSULTING_PROPOSAL_SECTIONS.length ||
      CONSULTING_PROPOSAL_SECTIONS.some((s) => !keys.has(s.section_key))
    if (needsNormalize) {
      await normalizeProposalSections(id)
      data = await loadProposal(id)
    }
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const body = req.body

    const existing = firstRow(await sql`SELECT id, status FROM proposals WHERE id = ${id}::uuid`)
    if (!existing) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    const scalarFields: [string, unknown][] = [
      ['title', body.title],
      ['client_name', body.client_name],
      ['client_id', body.client_id],
      ['status', body.status],
      ['total_cents', body.total_cents],
      ['project_type', body.project_type],
      ['currency', body.currency],
      ['expected_close_date', body.expected_close_date],
      ['owner_user_id', body.owner_user_id],
      ['template_key', body.template_key],
    ]

    for (const [col, val] of scalarFields) {
      if (val !== undefined) {
        if (col === 'client_id') {
          await pool.query(`UPDATE proposals SET client_id = $1::uuid, "updatedAt" = NOW() WHERE id = $2::uuid`, [val || null, id])
        } else {
          await pool.query(`UPDATE proposals SET ${col} = $1, "updatedAt" = NOW() WHERE id = $2::uuid`, [val, id])
        }
      }
    }

    if (body.metadata_json !== undefined) {
      await sql`
        UPDATE proposals SET metadata_json = ${JSON.stringify(body.metadata_json)}::jsonb, "updatedAt" = NOW()
        WHERE id = ${id}::uuid
      `
    }

    if (body.status !== undefined) {
      const st = String(body.status)
      if (st === 'sent') await sql`UPDATE proposals SET sent_at = COALESCE(sent_at, NOW()) WHERE id = ${id}::uuid`
      if (st === 'approved') await sql`UPDATE proposals SET approved_at = NOW() WHERE id = ${id}::uuid`
      if (st === 'rejected') await sql`UPDATE proposals SET rejected_at = NOW() WHERE id = ${id}::uuid`
      await logEvent(id, st)
    } else if (body.title !== undefined || body.metadata_json !== undefined || Array.isArray(body.sections)) {
      await logEvent(id, 'edited')
    }

    if (Array.isArray(body.sections)) {
      for (let i = 0; i < body.sections.length; i++) {
        const s = body.sections[i] as { id?: string; title?: string; content?: string; section_key?: string; block_type?: string }
        const title = s.title ?? ''
        const content = s.content ?? ''
        const blockType = s.block_type ?? null
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (s.id && uuidRe.test(s.id)) {
          await sql`
            UPDATE proposal_sections
            SET title = ${title}, content = ${content}, sort_order = ${i},
                block_type = COALESCE(${blockType}, block_type)
            WHERE id = ${s.id}::uuid AND proposal_id = ${id}::uuid
          `
        } else if (s.section_key) {
          await sql`
            UPDATE proposal_sections
            SET title = ${title}, content = ${content}, sort_order = ${i},
                block_type = COALESCE(${blockType}, block_type)
            WHERE proposal_id = ${id}::uuid AND section_key = ${s.section_key}
          `
        }
      }
    }

    res.json(await loadProposal(id))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/sections', async (req, res) => {
  try {
    const { title, section_key, block_type } = req.body
    const maxOrder = firstRow<{ n: number }>(await sql`
      SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM proposal_sections WHERE proposal_id = ${req.params.id}::uuid
    `)
    const row = firstRow(await sql`
      INSERT INTO proposal_sections (proposal_id, sort_order, section_key, title, content, block_type)
      VALUES (
        ${req.params.id}::uuid,
        ${maxOrder?.n ?? 0},
        ${section_key ?? 'custom'},
        ${title ?? 'New section'},
        '',
        ${block_type ?? 'text'}
      )
      RETURNING *
    `)
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.post('/:id/regenerate-token', async (req, res) => {
  try {
    const token = randomBytes(16).toString('hex')
    const row = firstRow(await sql`
      UPDATE proposals SET share_token = ${token}, "updatedAt" = NOW()
      WHERE id = ${req.params.id}::uuid
      RETURNING share_token
    `)
    if (!row) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:id/pdf', async (req, res) => {
  try {
    const id = req.params.id
    await normalizeProposalSections(id)
    const data = await loadProposal(id)
    if (!data) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    const html = buildProposalDocumentHtml({
      title: data.title as string,
      client_name: data.client_name as string | null,
      project_type: data.project_type as string | null,
      total_cents: data.total_cents as number | null,
      metadata_json: data.metadata_json as Record<string, unknown> | null,
      sections: data.sections as { title: string; content: string; block_type?: string; section_key?: string }[],
    })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Content-Disposition', `inline; filename="proposal-${id}.html"`)
    res.send(html)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await sql`DELETE FROM proposals WHERE id = ${req.params.id}::uuid`
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
