import { pool } from '../../../db.js'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import {
  CONSULTING_PROPOSAL_SECTIONS,
  consultingResultToMetadata,
  type ConsultingProposalResult,
} from './proposalEngine.js'

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

/** Insert any consulting sections missing from older proposals */
export async function ensureConsultingSections(proposalId: string) {
  const rows = (await sql`
    SELECT section_key, sort_order FROM proposal_sections WHERE proposal_id = ${proposalId}::uuid
  `) as { section_key: string; sort_order: number }[]
  const have = new Set(rows.map((r) => r.section_key))
  let order = rows.reduce((m, r) => Math.max(m, r.sort_order), -1) + 1
  for (const s of CONSULTING_PROPOSAL_SECTIONS) {
    if (have.has(s.section_key)) continue
    await sql`
      INSERT INTO proposal_sections (proposal_id, sort_order, section_key, title, content, block_type)
      VALUES (${proposalId}::uuid, ${order}, ${s.section_key}, ${s.title}, ${s.content}, ${s.block_type})
    `
    order++
  }
}

/** Drop legacy blocks and enforce the 16 standard consulting sections in order. */
export async function normalizeProposalSections(proposalId: string) {
  const canonical = CONSULTING_PROPOSAL_SECTIONS.map((s) => s.section_key)
  await pool.query(
    `DELETE FROM proposal_sections
     WHERE proposal_id = $1::uuid
     AND (section_key IS NULL OR NOT (section_key = ANY($2::text[])))`,
    [proposalId, canonical],
  )
  await ensureConsultingSections(proposalId)
  for (let i = 0; i < CONSULTING_PROPOSAL_SECTIONS.length; i++) {
    const s = CONSULTING_PROPOSAL_SECTIONS[i]!
    await sql`
      UPDATE proposal_sections
      SET sort_order = ${i}, title = ${s.title}, block_type = ${s.block_type}
      WHERE proposal_id = ${proposalId}::uuid AND section_key = ${s.section_key}
    `
  }
}

export async function applyConsultingResult(
  proposalId: string,
  result: ConsultingProposalResult,
): Promise<Record<string, unknown> | null> {
  await normalizeProposalSections(proposalId)
  const { metadata_json, total_cents, sectionContent } = consultingResultToMetadata(result, proposalId)

  await sql`
    UPDATE proposals SET
      total_cents = ${total_cents},
      metadata_json = ${JSON.stringify(metadata_json)}::jsonb,
      "updatedAt" = NOW()
    WHERE id = ${proposalId}::uuid
  `

  for (const [key, content] of Object.entries(sectionContent)) {
    if (!String(content ?? '').trim()) continue
    await sql`
      UPDATE proposal_sections SET content = ${content}
      WHERE proposal_id = ${proposalId}::uuid AND section_key = ${key}
    `
  }

  await logEvent(proposalId, 'edited', { source: 'consulting_ai', business_analysis: result.business_analysis })
  return await loadProposal(proposalId)
}
