import { pool } from "../../../db.js";
import { emitEvent } from "./events.js";

export async function listInvoices(orgId: string) {
  const r = await pool.query(`SELECT * FROM bos_invoices WHERE organization_id = $1 ORDER BY created_at DESC`, [orgId]);
  return r.rows;
}

export async function createInvoice(orgId: string, data: {
  client_name: string;
  deal_id?: string;
  lines?: { description: string; quantity: number; unit_cents: number }[];
}) {
  const count = await pool.query(`SELECT COUNT(*) FROM bos_invoices WHERE organization_id = $1`, [orgId]);
  const num = `INV-${String(Number(count.rows[0].count) + 1).padStart(4, "0")}`;
  const lines = data.lines ?? [{ description: "Professional services", quantity: 1, unit_cents: 10000000 }];
  const total = lines.reduce((s, l) => s + l.quantity * l.unit_cents, 0);
  const tax = Math.round(total * 0.18);

  const inv = await pool.query(
    `INSERT INTO bos_invoices (organization_id, deal_id, invoice_number, client_name, total_cents, tax_cents, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'sent') RETURNING *`,
    [orgId, data.deal_id ?? null, num, data.client_name, total + tax, tax]
  );

  for (let i = 0; i < lines.length; i++) {
    await pool.query(
      `INSERT INTO bos_invoice_lines (invoice_id, description, quantity, unit_cents, sort_order) VALUES ($1, $2, $3, $4, $5)`,
      [inv.rows[0].id, lines[i].description, lines[i].quantity, lines[i].unit_cents, i]
    );
  }

  await emitEvent(orgId, "invoice.created", { invoiceId: inv.rows[0].id, total_cents: total + tax });
  return inv.rows[0];
}

export async function listExpenses(orgId: string) {
  const r = await pool.query(`SELECT * FROM bos_expenses WHERE organization_id = $1 ORDER BY expense_date DESC`, [orgId]);
  return r.rows;
}

export async function createExpense(orgId: string, data: { description: string; amount_cents: number; category?: string }) {
  const r = await pool.query(
    `INSERT INTO bos_expenses (organization_id, description, amount_cents, category) VALUES ($1, $2, $3, $4) RETURNING *`,
    [orgId, data.description, data.amount_cents, data.category ?? "general"]
  );
  return r.rows[0];
}

export async function listPayments(orgId: string) {
  const r = await pool.query(`SELECT * FROM bos_payments WHERE organization_id = $1 ORDER BY created_at DESC`, [orgId]);
  return r.rows;
}

export async function getFinanceSummary(orgId: string) {
  const r = await pool.query(
    `SELECT
      COALESCE((SELECT SUM(total_cents) FROM bos_invoices WHERE organization_id = $1 AND status = 'sent'), 0) as outstanding_cents,
      COALESCE((SELECT SUM(amount_cents) FROM bos_payments WHERE organization_id = $1), 0) as collected_cents,
      COALESCE((SELECT SUM(amount_cents) FROM bos_expenses WHERE organization_id = $1), 0) as expenses_cents`,
    [orgId]
  );
  return r.rows[0];
}
