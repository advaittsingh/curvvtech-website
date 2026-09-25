import { sql, firstRow } from '../../../lib/sqlPool.js'
import type { ProposalContextInput } from './proposalEngine.js'

function summarizeNotes(rows: { body?: string }[], limit = 5): string | null {
  const parts = rows
    .map((r) => String(r.body ?? '').trim())
    .filter(Boolean)
    .slice(0, limit)
  return parts.length > 0 ? parts.join('\n---\n') : null
}

export async function loadProposalContextInput(opts: {
  proposal?: Record<string, unknown> | null
  lead_id?: string | null
  client_id?: string | null
}): Promise<ProposalContextInput> {
  const proposal = opts.proposal ?? {}
  let leadId = (opts.lead_id ?? proposal.lead_id) ? String(opts.lead_id ?? proposal.lead_id) : null
  let clientId = (opts.client_id ?? proposal.client_id) ? String(opts.client_id ?? proposal.client_id) : null

  const lead = leadId
    ? firstRow<Record<string, unknown>>(
        await sql`SELECT * FROM crm_leads WHERE id = ${leadId}::uuid`,
      )
    : null

  if (!clientId && lead?.converted_client_id) {
    clientId = String(lead.converted_client_id)
  }

  const client = clientId
    ? firstRow<Record<string, unknown>>(
        await sql`SELECT * FROM clients WHERE id = ${clientId}::uuid AND deleted_at IS NULL`,
      )
    : null

  const leadNotes = leadId
    ? ((await sql`
        SELECT body FROM crm_lead_notes
        WHERE lead_id = ${leadId}::uuid
        ORDER BY "createdAt" DESC LIMIT 8
      `) as { body?: string }[])
    : []

  const clientNotes = clientId
    ? ((await sql`
        SELECT body FROM client_notes
        WHERE client_id = ${clientId}::uuid
        ORDER BY "createdAt" DESC LIMIT 8
      `) as { body?: string }[])
    : []

  const projects = clientId
    ? ((await sql`
        SELECT name, status FROM projects
        WHERE client_id = ${clientId}::uuid
        ORDER BY "updatedAt" DESC LIMIT 5
      `) as { name?: string; status?: string }[])
    : []

  const activeProjects =
    projects.length > 0
      ? projects.map((p) => `${p.name ?? 'Project'} (${p.status ?? 'active'})`).join(', ')
      : null

  const clientName =
    (proposal.client_name ? String(proposal.client_name) : null) ??
    (client?.name ? String(client.name) : null) ??
    (lead?.company ? String(lead.company) : null) ??
    (lead?.name ? String(lead.name) : null)

  return {
    title: proposal.title ? String(proposal.title) : null,
    client_name: clientName,
    project_type: String(proposal.project_type ?? lead?.project_type ?? 'Custom'),
    total_cents: Number(proposal.total_cents ?? lead?.deal_value_cents ?? 0) || null,
    lead_name: lead?.name ? String(lead.name) : proposal.lead_name ? String(proposal.lead_name) : null,
    lead_company: lead?.company ? String(lead.company) : proposal.lead_company ? String(proposal.lead_company) : null,
    requirements: lead?.requirements ? String(lead.requirements) : proposal.requirements ? String(proposal.requirements) : null,
    message: lead?.message ? String(lead.message) : proposal.message ? String(proposal.message) : null,
    budget: lead?.budget ? String(lead.budget) : proposal.budget ? String(proposal.budget) : null,
    timeline: lead?.timeline ? String(lead.timeline) : proposal.timeline ? String(proposal.timeline) : null,
    deal_value_cents: lead?.deal_value_cents ? Number(lead.deal_value_cents) : proposal.deal_value_cents ? Number(proposal.deal_value_cents) : null,
    source: lead?.source ? String(lead.source) : proposal.source ? String(proposal.source) : null,
    tags: Array.isArray(lead?.tags) ? (lead.tags as string[]) : Array.isArray(proposal.tags) ? (proposal.tags as string[]) : null,
    client_email: client?.email ? String(client.email) : null,
    client_company: client?.company ? String(client.company) : lead?.company ? String(lead.company) : null,
    lead_notes: summarizeNotes(leadNotes),
    client_notes: summarizeNotes(clientNotes),
    active_projects: activeProjects,
    lead_status: lead?.status ? String(lead.status) : null,
    probability: lead?.probability != null ? Number(lead.probability) : null,
  }
}
