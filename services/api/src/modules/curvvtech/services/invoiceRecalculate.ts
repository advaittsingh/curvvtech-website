import { sql, firstRow } from '../../../lib/sqlPool.js'

export async function recalculateInvoiceTotals(invoiceId: string): Promise<void> {
  const items = await sql`
    SELECT quantity, unit_price_cents, tax_percent, discount_cents
    FROM invoice_items WHERE invoice_id = ${invoiceId}::uuid
  `
  let subtotal = 0
  let lineTax = 0
  for (const item of items as { quantity: number; unit_price_cents: number; tax_percent: number; discount_cents: number }[]) {
    const qty = Number(item.quantity ?? 1)
    const line = Math.round(qty * Number(item.unit_price_cents ?? 0)) - Number(item.discount_cents ?? 0)
    subtotal += line
    lineTax += Math.round(line * (Number(item.tax_percent ?? 0) / 100))
  }
  const inv = firstRow<{ tax_cents: number; discount_cents: number }>(
    await sql`SELECT tax_cents, discount_cents FROM invoices WHERE id = ${invoiceId}::uuid`,
  )
  const invoiceTax = Number(inv?.tax_cents ?? 0)
  const invoiceDiscount = Number(inv?.discount_cents ?? 0)
  const total = Math.max(0, subtotal + lineTax + invoiceTax - invoiceDiscount)
  await sql`
    UPDATE invoices SET
      subtotal_cents = ${subtotal},
      amount_cents = ${total},
      total_cents = ${total},
      "updatedAt" = NOW()
    WHERE id = ${invoiceId}::uuid
  `
}
