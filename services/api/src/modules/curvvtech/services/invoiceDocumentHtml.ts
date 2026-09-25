import { escapeHtml } from '../../../lib/escapeHtml.js'
import { CURVVTECH_LOGO_DATA_URI } from './curvvtechLogo.js'

export type InvoiceLineItem = {
  description: string
  quantity: number
  unit_price_cents: number
  tax_percent: number
  discount_cents: number
}

export type InvoiceDocumentInput = {
  invoice_number: string
  status?: string | null
  created_at?: string | null
  due_at?: string | null
  paid_at?: string | null
  subtotal_cents?: number | null
  tax_cents?: number | null
  discount_cents?: number | null
  total_cents?: number | null
  amount_cents?: number | null
  payment_link?: string | null
  client_name?: string | null
  client_company?: string | null
  client_email?: string | null
  client_phone?: string | null
  client_address?: string | null
  client_gst?: string | null
  client_pan?: string | null
  project_name?: string | null
  items: InvoiceLineItem[]
}

export type CompanyDocumentInput = {
  company_name?: string | null
  address?: string | null
  phone?: string | null
  gst_number?: string | null
  tax_id?: string | null
  pan_number?: string | null
  logo_url?: string | null
  bank_account_name?: string | null
  bank_account_number?: string | null
  bank_ifsc?: string | null
  bank_name?: string | null
  bank_account_type?: string | null
  upi_id?: string | null
  upi_qr_url?: string | null
  signature_url?: string | null
  default_gst_percent?: number | null
}

function formatInr(cents: number, decimals = 2): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(cents / 100)
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function panFromGst(gst?: string | null): string | null {
  const g = String(gst ?? '').trim().toUpperCase()
  if (g.length >= 12) return g.slice(2, 12)
  return null
}

function invoiceLabelFromNumber(num: string): string {
  const n = num.toUpperCase()
  if (n.includes('ADVANCE')) return 'Advance payment'
  if (n.includes('BACKEND')) return 'Backend development milestone'
  if (n.includes('BUILD')) return 'Full build milestone'
  if (n.includes('FINAL')) return 'Final payment'
  if (n.includes('RETAINER')) return 'Monthly retainer'
  return 'Professional services'
}

function normalizeItems(
  invoice: InvoiceDocumentInput,
  company: CompanyDocumentInput,
): { rows: InvoiceLineItem[]; defaultGst: number } {
  const defaultGst = Number(company.default_gst_percent ?? 18)
  if (invoice.items.length > 0) {
    return { rows: invoice.items, defaultGst }
  }

  const total = Number(invoice.total_cents ?? invoice.amount_cents ?? 0)
  if (total <= 0) return { rows: [], defaultGst }

  const invoiceTax = Number(invoice.tax_cents ?? 0)
  const desc =
    (invoice.project_name ? `${invoice.project_name} — ` : '') +
    invoiceLabelFromNumber(invoice.invoice_number)

  if (invoiceTax > 0) {
    const taxable = total - invoiceTax
    const taxPercent = taxable > 0 ? Math.round((invoiceTax / taxable) * 10000) / 100 : defaultGst
    return {
      rows: [
        {
          description: desc,
          quantity: 1,
          unit_price_cents: taxable,
          tax_percent: taxPercent,
          discount_cents: 0,
        },
      ],
      defaultGst,
    }
  }

  // No line items and no tax recorded on the invoice: present the full amount
  // as-is with 0% GST rather than assuming the company default rate. GST should
  // only appear when it was actually set on the invoice.
  return {
    rows: [
      {
        description: desc,
        quantity: 1,
        unit_price_cents: total,
        tax_percent: 0,
        discount_cents: 0,
      },
    ],
    defaultGst,
  }
}

function lineAmounts(item: InvoiceLineItem) {
  const qty = Number(item.quantity ?? 1)
  const rate = Number(item.unit_price_cents ?? 0)
  const discount = Number(item.discount_cents ?? 0)
  const lineTotal = Math.max(0, Math.round(qty * rate) - discount)
  const taxPercent = Number(item.tax_percent ?? 0)

  // The tax rate on the line item is authoritative — a rate of 0 means the
  // invoice was issued without GST. Never fall back to a default rate here, or
  // a 0% invoice would silently show fabricated GST in the document.
  if (taxPercent > 0) {
    const igst = Math.round(lineTotal * (taxPercent / 100))
    return { taxable: lineTotal, igst, total: lineTotal + igst, taxPercent }
  }

  return { taxable: lineTotal, igst: 0, total: lineTotal, taxPercent: 0 }
}

function detailRow(label: string, value?: string | null): string {
  if (!value?.trim()) return ''
  return `<p><span class="label">${escapeHtml(label)}</span> ${escapeHtml(value)}</p>`
}

const STYLES = `
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    color: #111;
    margin: 0;
    padding: 24px;
    background: #fff;
    font-size: 13px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc { max-width: 760px; margin: 0 auto; }
  .brandbar { display: flex; justify-content: flex-end; align-items: flex-start; margin-bottom: 4px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 28px; }
  .title { font-size: 32px; font-weight: 700; margin: 0 0 12px; letter-spacing: -0.02em; }
  .title-center { text-align: center; margin: 0 0 20px; }
  .meta p { margin: 0 0 4px; color: #333; }
  .meta strong { color: #111; }
  .logo-wrap { text-align: right; }
  .logo-wrap img { max-height: 60px; max-width: 200px; object-fit: contain; }
  .brand-fallback { font-size: 22px; font-weight: 700; letter-spacing: -0.03em; }
  .parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e5e5e5;
  }
  .party h3 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #666;
    margin: 0 0 10px;
    font-weight: 600;
  }
  .party p { margin: 0 0 3px; color: #222; }
  .party .name { font-weight: 600; font-size: 15px; margin-bottom: 6px; }
  .party .label { color: #666; }
  table.items {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 24px;
    font-size: 12px;
  }
  table.items thead th {
    background: #111;
    color: #fff;
    font-weight: 600;
    text-align: left;
    padding: 10px 8px;
    white-space: nowrap;
  }
  table.items thead th.num { text-align: right; }
  table.items tbody td {
    padding: 12px 8px;
    border-bottom: 1px solid #eee;
    vertical-align: top;
  }
  table.items tbody td.num { text-align: right; white-space: nowrap; }
  table.items tbody tr:last-child td { border-bottom: none; }
  .footer-summary {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
    page-break-inside: avoid;
  }
  .footer-summary .summary { min-width: 260px; }
  .summary { text-align: right; }
  .summary .row { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 6px; }
  .summary .row span:first-child { color: #666; }
  .summary .divider { border-top: 1px solid #ddd; margin: 10px 0; }
  .summary .grand { font-size: 18px; font-weight: 700; }
  .signatory {
    margin-top: 36px;
    text-align: right;
    page-break-inside: avoid;
  }
  .signatory .system-note { font-size: 12px; font-style: italic; color: #888; }
  .status-paid { color: #15803d; font-weight: 600; }
  @media print {
    body { padding: 0; }
    .doc { max-width: none; }
  }
`

export function buildInvoiceDocumentHtml(
  invoice: InvoiceDocumentInput,
  company: CompanyDocumentInput,
): string {
  const { rows } = normalizeItems(invoice, company)
  const companyGst = company.gst_number ?? company.tax_id ?? null
  const companyPan = company.pan_number ?? panFromGst(companyGst)
  const clientGst = invoice.client_gst ?? null
  const clientPan = invoice.client_pan ?? panFromGst(clientGst)
  const clientDisplay = invoice.client_company || invoice.client_name || 'Client'

  let subtotal = 0
  let totalIgst = 0
  let grandTotal = 0

  const itemRows = rows
    .map((item, idx) => {
      const { taxable, igst, total, taxPercent } = lineAmounts(item)
      subtotal += taxable
      totalIgst += igst
      grandTotal += total
      return `<tr>
        <td>${idx + 1}. ${escapeHtml(item.description)}</td>
        <td class="num">${taxPercent}%</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatInr(item.unit_price_cents, 4)}</td>
        <td class="num">${formatInr(taxable)}</td>
        <td class="num">${formatInr(igst)}</td>
        <td class="num">${formatInr(total)}</td>
      </tr>`
    })
    .join('')

  const invoiceDiscount = Number(invoice.discount_cents ?? 0)
  if (invoiceDiscount > 0) grandTotal = Math.max(0, grandTotal - invoiceDiscount)

  const storedTotal = Number(invoice.total_cents ?? invoice.amount_cents ?? 0)
  if (storedTotal > 0 && rows.length === 1 && rows[0] && !invoice.items.length) {
    grandTotal = storedTotal
    const diff = storedTotal - (subtotal + totalIgst)
    if (Math.abs(diff) <= 2) totalIgst += diff
  }

  const logo = `<img src="${escapeHtml(company.logo_url || CURVVTECH_LOGO_DATA_URI)}" alt="${escapeHtml(company.company_name ?? 'Curvvtech')}" />`

  const status = String(invoice.status ?? 'draft').toLowerCase()
  const statusClass = status === 'paid' ? 'status-paid' : ''
  const numUpper = String(invoice.invoice_number ?? '').toUpperCase()
  const isProforma = numUpper.startsWith('PI-') || numUpper.includes('PROFORMA')
  const docTitle = isProforma ? 'Proforma Invoice' : 'Invoice'
  const numberLabel = isProforma ? 'Proforma No #' : 'Invoice No #'
  const dateLabel = isProforma ? 'Proforma Date' : 'Invoice Date'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(docTitle)} ${escapeHtml(invoice.invoice_number)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="doc">
    <div class="brandbar">
      <div class="logo-wrap">${logo}</div>
    </div>
    <h1 class="title title-center">${escapeHtml(docTitle)}</h1>
    <div class="top">
      <div class="meta">
        <p><strong>${escapeHtml(numberLabel)}</strong> ${escapeHtml(invoice.invoice_number)}</p>
        <p><strong>${escapeHtml(dateLabel)}</strong> ${formatDate(invoice.created_at)}</p>
        <p><strong>Due Date</strong> ${formatDate(invoice.due_at)}</p>
        ${status === 'paid' && invoice.paid_at ? `<p><strong>Paid on</strong> ${formatDate(invoice.paid_at)}</p>` : ''}
        <p><strong>Status</strong> <span class="${statusClass}">${escapeHtml(status)}</span></p>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <h3>Billed By</h3>
        <p class="name">${escapeHtml(company.company_name ?? 'Curvvtech')}</p>
        ${company.address ? `<p>${escapeHtml(company.address)}</p>` : ''}
        ${companyGst ? `<p><span class="label">GSTIN:</span> ${escapeHtml(companyGst)}</p>` : ''}
        ${companyPan ? `<p><span class="label">PAN:</span> ${escapeHtml(companyPan)}</p>` : ''}
        ${company.phone ? `<p><span class="label">Phone:</span> ${escapeHtml(company.phone)}</p>` : ''}
      </div>
      <div class="party">
        <h3>Billed To</h3>
        <p class="name">${escapeHtml(clientDisplay)}</p>
        ${invoice.client_address ? `<p>${escapeHtml(invoice.client_address)}</p>` : ''}
        ${clientGst ? `<p><span class="label">GSTIN:</span> ${escapeHtml(clientGst)}</p>` : ''}
        ${clientPan ? `<p><span class="label">PAN:</span> ${escapeHtml(clientPan)}</p>` : ''}
        ${invoice.client_phone ? `<p><span class="label">Phone:</span> ${escapeHtml(invoice.client_phone)}</p>` : ''}
        ${invoice.client_email ? `<p><span class="label">Email:</span> ${escapeHtml(invoice.client_email)}</p>` : ''}
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th>Item</th>
          <th class="num">GST Rate</th>
          <th class="num">Quantity</th>
          <th class="num">Rate</th>
          <th class="num">Amount</th>
          <th class="num">IGST</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows || '<tr><td colspan="7">No line items</td></tr>'}</tbody>
    </table>

    <div class="footer-summary">
      <div class="summary">
        <div class="row"><span>Amount</span><span>${formatInr(subtotal)}</span></div>
        <div class="row"><span>IGST</span><span>${formatInr(totalIgst)}</span></div>
        ${invoiceDiscount > 0 ? `<div class="row"><span>Discount</span><span>−${formatInr(invoiceDiscount)}</span></div>` : ''}
        <div class="divider"></div>
        <div class="row grand"><span>Total (INR)</span><span>${formatInr(grandTotal)}</span></div>
      </div>
    </div>

    <div class="signatory">
      <div class="system-note">This is a system generated bill and shall not need a signature.</div>
    </div>
  </div>
</body>
</html>`
}

export type ReceiptDocumentInput = {
  invoice_number: string
  amount_cents: number
  paid_at?: string | null
  method?: string | null
  payment_reference?: string | null
  client_name?: string | null
  client_company?: string | null
  client_email?: string | null
  project_name?: string | null
}

const RECEIPT_EXTRA_STYLES = `
  .paid-stamp {
    display: inline-block;
    border: 3px solid #15803d;
    color: #15803d;
    font-weight: 800;
    font-size: 20px;
    letter-spacing: 0.12em;
    padding: 6px 18px;
    border-radius: 8px;
    transform: rotate(-6deg);
    text-transform: uppercase;
  }
  .amount-box {
    margin: 24px 0;
    padding: 20px 24px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .amount-box .lbl { color: #166534; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
  .amount-box .val { font-size: 28px; font-weight: 800; color: #14532d; }
  .receipt-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 32px; margin-top: 8px; }
  .receipt-meta .k { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
  .receipt-meta .v { font-weight: 600; margin-top: 2px; }
  .thanks { margin-top: 32px; padding-top: 18px; border-top: 1px solid #e5e5e5; color: #444; font-size: 12px; }
`

/** A standalone payment-receipt document for a paid invoice. */
export function buildReceiptDocumentHtml(
  receipt: ReceiptDocumentInput,
  company: CompanyDocumentInput,
): string {
  const companyName = company.company_name ?? 'Curvvtech'
  const logo = `<img src="${escapeHtml(company.logo_url || CURVVTECH_LOGO_DATA_URI)}" alt="${escapeHtml(companyName)}" />`
  const receiptNo = `RCPT-${receipt.invoice_number}`
  const clientDisplay = receipt.client_company || receipt.client_name || 'Client'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(receiptNo)}</title>
  <style>${STYLES}${RECEIPT_EXTRA_STYLES}</style>
</head>
<body>
  <div class="doc">
    <div class="top">
      <div class="meta">
        <h1 class="title">Payment Receipt</h1>
        <p><strong>Receipt No #</strong> ${escapeHtml(receiptNo)}</p>
        <p><strong>Invoice Ref</strong> ${escapeHtml(receipt.invoice_number)}</p>
        <p><strong>Date</strong> ${formatDate(receipt.paid_at)}</p>
      </div>
      <div class="logo-wrap">
        ${logo}
        <div style="margin-top:14px"><span class="paid-stamp">Paid</span></div>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <h3>Received From</h3>
        <p class="name">${escapeHtml(clientDisplay)}</p>
        ${detailRow('Contact', receipt.client_name)}
        ${detailRow('Email', receipt.client_email)}
        ${detailRow('Project', receipt.project_name)}
      </div>
      <div class="party">
        <h3>Received By</h3>
        <p class="name">${escapeHtml(companyName)}</p>
        ${detailRow('Address', company.address)}
        ${detailRow('Phone', company.phone)}
        ${detailRow('GSTIN', company.gst_number ?? company.tax_id)}
      </div>
    </div>

    <div class="amount-box">
      <span class="lbl">Amount Received</span>
      <span class="val">${formatInr(receipt.amount_cents)}</span>
    </div>

    <div class="receipt-meta">
      <div><div class="k">Payment Method</div><div class="v">${escapeHtml(receipt.method ?? 'Online')}</div></div>
      <div><div class="k">Payment Date</div><div class="v">${formatDate(receipt.paid_at)}</div></div>
      ${receipt.payment_reference ? `<div><div class="k">Reference</div><div class="v">${escapeHtml(receipt.payment_reference)}</div></div>` : ''}
      <div><div class="k">Status</div><div class="v status-paid">Paid in full</div></div>
    </div>

    <p class="thanks">Thank you for your payment. This receipt confirms that the amount above has been received against invoice ${escapeHtml(receipt.invoice_number)}. For any questions, please contact ${escapeHtml(companyName)}.</p>
  </div>
</body>
</html>`
}
