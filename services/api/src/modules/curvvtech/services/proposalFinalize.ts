import { randomBytes } from 'node:crypto'
import { sql, firstRow } from '../../../lib/sqlPool.js'
import { convertLeadToClient } from '../admin/leads.js'

type Milestone = { id?: string; label: string; percent: number }
type Addon = { id: string; name: string; amount_cents: number }
type LineItem = { description: string; qty: number; amount_cents: number }

type ProposalMeta = {
  line_items?: LineItem[]
  payment_milestones?: Milestone[]
  addons?: Addon[]
  selected_addon_ids?: string[]
  signature?: { client_name?: string; designation?: string; signed_at?: string }
}

function sumLineItems(items: LineItem[] | undefined): number {
  return (items ?? []).reduce((s, i) => s + i.qty * i.amount_cents, 0)
}

function computeTotalCents(meta: ProposalMeta, selectedAddonIds?: string[]): number {
  const base = sumLineItems(meta.line_items)
  const ids = selectedAddonIds ?? meta.selected_addon_ids ?? []
  const addonTotal = (meta.addons ?? [])
    .filter((a) => ids.includes(a.id))
    .reduce((s, a) => s + a.amount_cents, 0)
  return base + addonTotal
}

async function logEvent(proposalId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  await sql`
    INSERT INTO proposal_events (proposal_id, event_type, metadata)
    VALUES (${proposalId}::uuid, ${eventType}, ${JSON.stringify(metadata)}::jsonb)
  `
}

async function activateClientPortal(clientId: string): Promise<{ portal_url: string; portal_token: string }> {
  const token = randomBytes(24).toString('hex')
  const portalBase = process.env.CLIENT_PORTAL_URL ?? 'https://client.curvvtech.com'
  await sql`
    UPDATE clients SET
      portal_status = 'invited',
      portal_invite_token = ${token},
      "updatedAt" = NOW()
    WHERE id = ${clientId}::uuid
  `
  return { portal_url: `${portalBase.replace(/\/$/, '')}/invite/${token}`, portal_token: token }
}

async function createMilestoneInvoices(
  clientId: string,
  projectId: string,
  totalCents: number,
  milestones: Milestone[],
  proposalTitle: string,
): Promise<string[]> {
  const ids: string[] = []
  const ms = milestones.length > 0 ? milestones : [{ label: 'Full payment', percent: 100 }]

  for (let i = 0; i < ms.length; i++) {
    const m = ms[i]!
    const amount = Math.round(totalCents * (m.percent / 100))
    if (amount <= 0) continue

    const inv = firstRow<{ id: string }>(await sql`
      INSERT INTO invoices (client_id, project_id, invoice_number, status, total_cents, "updatedAt", "createdAt")
      VALUES (
        ${clientId}::uuid,
        ${projectId}::uuid,
        ${`${projectId.slice(0, 8)}-M${i + 1}`},
        'draft',
        ${amount},
        NOW(), NOW()
      )
      RETURNING id::text AS id
    `)

    if (inv) {
      await sql`
        INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_cents, "createdAt")
        VALUES (
          ${inv.id}::uuid,
          ${`${proposalTitle} — ${m.label}`},
          1,
          ${amount},
          NOW()
        )
      `
      ids.push(inv.id)
    }
  }

  return ids
}

export type FinalizeProposalInput = {
  selectedAddonIds?: string[]
  signature?: { client_name?: string; designation?: string }
  clerkUserId?: string | null
}

export type FinalizeProposalResult = {
  client_id: string
  project_id: string
  invoice_ids: string[]
  portal_url: string
  total_cents: number
}

export async function finalizeApprovedProposal(
  proposalId: string,
  input: FinalizeProposalInput = {},
): Promise<FinalizeProposalResult | null> {
  const proposal = firstRow<Record<string, unknown>>(
    await sql`SELECT * FROM proposals WHERE id = ${proposalId}::uuid`,
  )
  if (!proposal) return null

  const meta = (proposal.metadata_json ?? {}) as ProposalMeta
  const selectedAddonIds = input.selectedAddonIds ?? meta.selected_addon_ids ?? []
  const totalCents = computeTotalCents(meta, selectedAddonIds)

  const updatedMeta: ProposalMeta = {
    ...meta,
    selected_addon_ids: selectedAddonIds,
    signature: {
      ...meta.signature,
      ...input.signature,
      signed_at: new Date().toISOString(),
    },
  }

  await sql`
    UPDATE proposals SET
      total_cents = ${totalCents},
      metadata_json = ${JSON.stringify(updatedMeta)}::jsonb,
      "updatedAt" = NOW()
    WHERE id = ${proposalId}::uuid
  `

  let clientId = proposal.client_id ? String(proposal.client_id) : null
  let projectId: string | null = null

  if (proposal.lead_id && !clientId) {
    const converted = await convertLeadToClient(String(proposal.lead_id), input.clerkUserId)
    if (converted) {
      clientId = converted.client_id
      projectId = converted.project_id ?? null
    }
  }

  if (!clientId) {
    const client = firstRow<{ id: string }>(await sql`
      INSERT INTO clients (name, email, company, contract_value_cents, status, "updatedAt", "createdAt")
      VALUES (
        ${String(proposal.client_name ?? 'Client')},
        NULL,
        ${proposal.client_name ?? null},
        ${totalCents},
        'active',
        NOW(), NOW()
      )
      RETURNING id::text AS id
    `)
    clientId = client!.id
  } else {
    await sql`
      UPDATE clients SET contract_value_cents = ${totalCents}, "updatedAt" = NOW()
      WHERE id = ${clientId}::uuid
    `
  }

  if (!projectId) {
    const existing = firstRow<{ id: string }>(await sql`
      SELECT id::text AS id FROM projects WHERE client_id = ${clientId}::uuid
      ORDER BY "createdAt" DESC LIMIT 1
    `)
    if (existing) {
      projectId = existing.id
    } else {
      const project = firstRow<{ id: string }>(await sql`
        INSERT INTO projects (client_id, name, status, progress_pct, budget_cents, "updatedAt", "createdAt")
        VALUES (
          ${clientId}::uuid,
          ${String(proposal.title ?? proposal.project_type ?? 'Project')},
          'planning',
          0,
          ${totalCents},
          NOW(), NOW()
        )
        RETURNING id::text AS id
      `)
      projectId = project!.id
    }
  }

  const milestones = meta.payment_milestones ?? [
    { label: '50% Advance', percent: 50 },
    { label: '30% Testing', percent: 30 },
    { label: '20% Delivery', percent: 20 },
  ]

  const existingInvoices = (await sql`
    SELECT id::text AS id FROM invoices WHERE project_id = ${projectId}::uuid
  `) as { id: string }[]

  let invoiceIds: string[] = existingInvoices.map((r) => r.id)
  if (invoiceIds.length === 0) {
    invoiceIds = await createMilestoneInvoices(
      clientId,
      projectId!,
      totalCents,
      milestones,
      String(proposal.title ?? 'Proposal'),
    )
    await logEvent(proposalId, 'invoices_generated', { invoice_ids: invoiceIds })
  }

  const portal = await activateClientPortal(clientId)
  await logEvent(proposalId, 'portal_activated', { portal_url: portal.portal_url })

  await sql`
    UPDATE proposals SET
      status = 'approved',
      approved_at = COALESCE(approved_at, NOW()),
      client_id = ${clientId}::uuid,
      "updatedAt" = NOW()
    WHERE id = ${proposalId}::uuid
  `
  await logEvent(proposalId, 'approved', {
    client_id: clientId,
    project_id: projectId,
    invoice_ids: invoiceIds,
    total_cents: totalCents,
  })

  return {
    client_id: clientId,
    project_id: projectId!,
    invoice_ids: invoiceIds,
    portal_url: portal.portal_url,
    total_cents: totalCents,
  }
}

export { computeTotalCents }
