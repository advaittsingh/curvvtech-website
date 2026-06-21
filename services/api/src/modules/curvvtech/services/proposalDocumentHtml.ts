import { escapeHtml } from '../../../lib/escapeHtml.js'

type LineItem = { id?: string; description: string; qty: number; amount_cents: number }
type Milestone = { id?: string; label: string; percent: number }
type Addon = { id?: string; name: string; amount_cents: number }
type TimelineRow = { id?: string; title: string; start_date?: string; end_date?: string; duration?: string; description?: string }
type ScopeGroup = { title: string; items: string[] }
type Section = { title: string; content: string; block_type?: string; section_key?: string }

export type ProposalDocumentInput = {
  title?: string | null
  client_name?: string | null
  project_type?: string | null
  total_cents?: number | null
  metadata_json?: Record<string, unknown> | null
  sections?: Section[] | null
}

function formatInr(cents: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}

function sumLineItems(items: LineItem[]): number {
  return items.reduce((s, i) => s + i.qty * i.amount_cents, 0)
}

/** Escape HTML and render simple **bold** markdown. */
function formatProposalText(text: string): string {
  const parts = String(text ?? '').split(/(\*\*.+?\*\*)/g)
  return parts
    .map((part) => {
      const bold = /^\*\*(.+)\*\*$/.exec(part)
      if (bold) return `<strong>${escapeHtml(bold[1])}</strong>`
      return escapeHtml(part)
    })
    .join('')
}

const STYLES = `
  @page { size: A4 portrait; margin: 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Inter, system-ui, -apple-system, sans-serif;
    color: #1c1917;
    margin: 0;
    padding: 0;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc { max-width: 720px; margin: 0 auto; }
  .cover {
    background: #1c1917;
    color: #fff;
    text-align: center;
    padding: 48px 32px;
  }
  .cover-kicker {
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #a8a29e;
    margin: 0 0 12px;
  }
  .cover h1 { font-size: 28px; font-weight: 600; margin: 0; line-height: 1.2; }
  .cover p { margin: 8px 0 0; color: #d6d3d1; }
  .cover .muted { color: #a8a29e; font-size: 13px; }
  .cover .total { margin-top: 24px; font-size: 22px; font-weight: 600; color: #fff; }
  .cover-text { color: #e7e5e4; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
  .body { padding: 40px 32px; }
  section { margin-bottom: 40px; page-break-inside: avoid; }
  h2 {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e7e5e4;
  }
  .text { white-space: pre-wrap; line-height: 1.65; color: #44403c; margin: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px; }
  th { text-align: left; color: #78716c; font-weight: 500; padding: 8px 0; border-bottom: 1px solid #e7e5e4; }
  td { padding: 10px 0; border-bottom: 1px solid #f5f5f4; vertical-align: top; }
  .right { text-align: right; }
  .center { text-align: center; }
  .scope-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .scope-grid h3 { font-size: 15px; margin: 0 0 8px; color: #292524; }
  .scope-grid ul { margin: 0; padding-left: 18px; color: #57534e; font-size: 14px; }
  .scope-grid li { margin: 4px 0; }
  .milestones { margin: 12px 0 0; padding-left: 18px; color: #57534e; font-size: 14px; }
  .milestones li { margin: 4px 0; }
  .total-row { text-align: right; font-size: 18px; font-weight: 600; margin-top: 16px; }
  .addon {
    display: flex;
    justify-content: space-between;
    border: 1px solid #f5f5f4;
    border-radius: 8px;
    padding: 10px 16px;
    margin: 8px 0;
    font-size: 14px;
  }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 24px; }
  .sig-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #a8a29e; margin-bottom: 24px; }
  .sig-line { border-bottom: 1px solid #d6d3d1; height: 48px; margin-bottom: 8px; }
  .sig-name { font-weight: 500; font-size: 14px; margin: 0; }
  .sig-sub { font-size: 12px; color: #78716c; margin: 4px 0 0; }
  .sig-date { font-size: 12px; color: #a8a29e; margin: 8px 0 0; }
  .footer {
    background: #fafaf9;
    border-top: 1px solid #e7e5e4;
    text-align: center;
    padding: 16px;
    font-size: 11px;
    color: #a8a29e;
  }
  @media print {
    .doc { max-width: none; }
    section { page-break-inside: avoid; }
  }
`

export function buildProposalDocumentHtml(input: ProposalDocumentInput): string {
  const sections = (input.sections ?? []) as Section[]
  const meta = (input.metadata_json ?? {}) as Record<string, unknown>
  const title = String(input.title ?? 'Proposal')
  const clientName = String(input.client_name ?? 'Client')
  const projectType = input.project_type ? String(input.project_type) : ''
  const proposalRef = meta.proposal_reference ? String(meta.proposal_reference) : ''

  const lineItems = (meta.line_items as LineItem[] | undefined) ?? []
  const paymentMilestones = (meta.payment_milestones as Milestone[] | undefined) ?? []
  const addons = (meta.addons as Addon[] | undefined) ?? []
  const timelineRows = (meta.timeline_milestones as TimelineRow[] | undefined) ?? []
  const scopeGroups = ((meta.scope_modules as { groups?: ScopeGroup[] } | undefined)?.groups ?? []) as ScopeGroup[]
  const signature = (meta.signature as { client_name?: string; designation?: string } | undefined) ?? {}

  const lineTotal = sumLineItems(lineItems)
  const total = Number(input.total_cents ?? 0) || lineTotal

  const coverSection = sections.find((s) => s.section_key === 'cover' || s.title === 'Cover')
  const skipTypes = new Set(['cover', 'pricing', 'addons', 'signature', 'scope_modules'])

  let coverHtml: string
  if (coverSection?.content?.trim()) {
    coverHtml = `<p class="cover-text">${formatProposalText(coverSection.content)}</p>`
  } else {
    coverHtml = `
      <h1>${escapeHtml(title)}</h1>
      <p>Prepared for ${escapeHtml(clientName)}</p>
      <p class="muted">Prepared by CurvvTech</p>
      ${proposalRef ? `<p class="muted">Ref: ${escapeHtml(proposalRef)}</p>` : ''}
      ${projectType ? `<p class="muted">${escapeHtml(projectType)}</p>` : ''}
    `
  }
  if (total > 0) {
    coverHtml += `<p class="total">${escapeHtml(formatInr(total))}</p>`
  }

  const sectionParts: string[] = []

  for (const section of sections) {
    const block = section.block_type ?? 'text'
    if (skipTypes.has(block) || section.section_key === 'cover') continue

    if (block === 'scope_modules') {
      if (scopeGroups.length === 0) continue
      sectionParts.push(`
        <section>
          <h2>${escapeHtml(section.title)}</h2>
          <div class="scope-grid">
            ${scopeGroups
              .map(
                (g) => `
              <div>
                <h3>${escapeHtml(g.title)}</h3>
                <ul>${g.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
              </div>`,
              )
              .join('')}
          </div>
        </section>`)
      continue
    }

    if (block === 'timeline') {
      if (timelineRows.length === 0) continue
      sectionParts.push(`
        <section>
          <h2>${escapeHtml(section.title)}</h2>
          <table>
            <thead>
              <tr>
                <th>Milestone</th>
                <th>Start</th>
                <th>End</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${timelineRows
                .map(
                  (m) => `
                <tr>
                  <td><strong>${escapeHtml(m.title)}</strong></td>
                  <td>${escapeHtml(m.start_date ?? m.duration ?? '—')}</td>
                  <td>${escapeHtml(m.end_date ?? '—')}</td>
                  <td>${escapeHtml(m.description ?? '—')}</td>
                </tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </section>`)
      continue
    }

    if (!section.content?.trim()) continue

    sectionParts.push(`
      <section>
        <h2>${escapeHtml(section.title)}</h2>
        <p class="text">${formatProposalText(section.content)}</p>
      </section>`)
  }

  let pricingHtml = ''
  if (lineItems.length > 0) {
    pricingHtml = `
      <section>
        <h2>Investment &amp; Milestones</h2>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="center">Qty</th>
              <th class="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineItems
              .map(
                (item) => `
              <tr>
                <td>${escapeHtml(item.description)}</td>
                <td class="center">${item.qty}</td>
                <td class="right">${escapeHtml(formatInr(item.qty * item.amount_cents))}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>
        <p class="total-row">Total: ${escapeHtml(formatInr(lineTotal))}</p>
        ${
          paymentMilestones.length > 0
            ? `<ul class="milestones">${paymentMilestones
                .map(
                  (m) =>
                    `<li>${escapeHtml(m.label)} — ${m.percent}% (${escapeHtml(formatInr(Math.round(lineTotal * (m.percent / 100))))})</li>`,
                )
                .join('')}</ul>`
            : ''
        }
      </section>`
  }

  let addonsHtml = ''
  if (addons.length > 0) {
    addonsHtml = `
      <section>
        <h2>Optional add-ons</h2>
        ${addons
          .map(
            (a) => `
          <div class="addon">
            <span>${escapeHtml(a.name)}</span>
            <strong>+${escapeHtml(formatInr(a.amount_cents))}</strong>
          </div>`,
          )
          .join('')}
      </section>`
  }

  const signaturesHtml = `
    <section>
      <h2>Signatures</h2>
      <div class="signatures">
        <div>
          <p class="sig-label">CurvvTech</p>
          <div class="sig-line"></div>
          <p class="sig-name">Authorized signatory</p>
          <p class="sig-date">Date: _______________</p>
        </div>
        <div>
          <p class="sig-label">${escapeHtml(clientName)}</p>
          <div class="sig-line"></div>
          <p class="sig-name">${escapeHtml(signature.client_name ?? 'Client signatory')}</p>
          ${signature.designation ? `<p class="sig-sub">${escapeHtml(signature.designation)}</p>` : ''}
          <p class="sig-date">Date: _______________</p>
        </div>
      </div>
    </section>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="doc">
    <div class="cover">
      <p class="cover-kicker">Digital Transformation Proposal</p>
      ${coverHtml}
    </div>
    <div class="body">
      ${sectionParts.join('\n')}
      ${pricingHtml}
      ${addonsHtml}
      ${signaturesHtml}
    </div>
    <div class="footer">CurvvTech · Confidential proposal</div>
  </div>
</body>
</html>`
}
