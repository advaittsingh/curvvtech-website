#!/usr/bin/env node
/**
 * Seed client:paata-ai — Sachin SD / Paata.ai (App + Website projects).
 * Usage: node scripts/seed-paata-ai.mjs --env .env.aws
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import pg from "pg";

const envArgIdx = process.argv.indexOf("--env");
config({ path: resolve(envArgIdx > -1 ? process.argv[envArgIdx + 1] : ".env.aws") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

/** Rupees → paise */
const inr = (n) => Math.round(Number(n) * 100);

async function recalcInvoice(client, invoiceId) {
  const items = await client.query(
    `SELECT quantity, unit_price_cents, tax_percent, discount_cents FROM invoice_items WHERE invoice_id = $1`,
    [invoiceId],
  );
  let subtotal = 0;
  let lineTax = 0;
  for (const item of items.rows) {
    const qty = Number(item.quantity ?? 1);
    const line = Math.round(qty * Number(item.unit_price_cents ?? 0)) - Number(item.discount_cents ?? 0);
    subtotal += line;
    lineTax += Math.round(line * (Number(item.tax_percent ?? 0) / 100));
  }
  const total = subtotal + lineTax;
  await client.query(
    `UPDATE invoices SET subtotal_cents = $2, tax_cents = $3, amount_cents = $4, total_cents = $4, "updatedAt" = NOW() WHERE id = $1`,
    [invoiceId, subtotal, lineTax, total],
  );
  return total;
}

const CLIENT = {
  import_key: "client:paata-ai",
  name: "Sachin SD",
  company: "Paata.ai",
  email: "sd.sachin8@gmail.com",
  phone: "+91 95350 33777",
  industry: "EdTech",
  address: "Bengaluru",
  contract_value_inr: 159300, // 123900 + 35400
  created_at: "2025-08-01",
};

const PROJECTS = [
  {
    import_key: "project:paata-app-development",
    name: "App Development",
    project_type: "Mobile App",
    quoted_inr: 105000,
    gst_inr: 18900,
    budget_inr: 123900,
    status: "completed",
    progress_pct: 100,
    created_at: "2025-08-01",
    start_date: "2025-08-05",
    target_end_date: "2025-11-08",
    completed_at: "2025-11-08 00:00:00+05:30",
    milestones: [
      { title: "Advance (50%)", completion_pct: 50, status: "completed", completed_at: "2025-09-07" },
      { title: "Final Delivery (50%)", completion_pct: 50, status: "completed", completed_at: "2025-11-08" },
    ],
    invoices: [
      {
        invoice_number: "INV-2025-PAATA-APP-01",
        label: "Advance",
        date: "2025-09-07",
        unit_inr: 52500,
        tax_percent: 18,
      },
      {
        invoice_number: "INV-2025-PAATA-APP-02",
        label: "Final",
        date: "2025-11-08",
        unit_inr: 52500,
        tax_percent: 18,
      },
    ],
  },
  {
    import_key: "project:paata-website-development",
    name: "Website Development",
    project_type: "Website",
    quoted_inr: 30000,
    gst_inr: 5400,
    budget_inr: 35400,
    status: "completed",
    progress_pct: 100,
    created_at: "2025-08-15",
    start_date: "2025-09-01",
    target_end_date: "2025-10-15",
    completed_at: "2025-10-15 00:00:00+05:30",
    milestones: [
      { title: "Advance (40%)", completion_pct: 40, status: "completed", completed_at: "2025-09-15" },
      { title: "Mid Review (30%)", completion_pct: 30, status: "completed", completed_at: "2025-10-09" },
      { title: "Final Delivery (30%)", completion_pct: 30, status: "completed", completed_at: "2025-10-15" },
    ],
    invoices: [
      {
        invoice_number: "INV-2025-PAATA-WEB-01",
        label: "Advance",
        date: "2025-09-15",
        unit_inr: 12000,
        tax_percent: 18,
      },
      {
        invoice_number: "INV-2025-PAATA-WEB-02",
        label: "Mid Review",
        date: "2025-10-09",
        unit_inr: 9000,
        tax_percent: 18,
      },
      {
        invoice_number: "INV-2025-PAATA-WEB-03",
        label: "Final Delivery",
        date: "2025-10-15",
        unit_inr: 9000,
        tax_percent: 18,
      },
    ],
  },
];

const client = await pool.connect();
try {
  await client.query("BEGIN");

  const org = await client.query(`SELECT id FROM organizations WHERE slug = 'curvvtech' LIMIT 1`);
  const orgId = org.rows[0]?.id;
  if (!orgId) throw new Error("curvvtech organization not found");

  const existing = await client.query(`SELECT id FROM clients WHERE import_key = $1`, [CLIENT.import_key]);
  if (existing.rows.length) {
    console.log("SKIP client already exists:", existing.rows[0].id);
    await client.query("ROLLBACK");
    process.exit(0);
  }

  const mgr = await client.query(`SELECT id, email FROM users WHERE email = 'advaitsingh@curvvtech.in' LIMIT 1`);
  const managerId = mgr.rows[0]?.id ?? null;
  const managerEmail = mgr.rows[0]?.email ?? null;

  const clientRes = await client.query(
    `INSERT INTO clients (
      name, company, email, phone, industry, address, contract_value_cents,
      status, import_key, organization_id, account_manager_id,
      "createdAt", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9,$10,$11::timestamptz,$11::timestamptz)
    RETURNING id`,
    [
      CLIENT.name,
      CLIENT.company,
      CLIENT.email,
      CLIENT.phone,
      CLIENT.industry,
      CLIENT.address,
      inr(CLIENT.contract_value_inr),
      CLIENT.import_key,
      orgId,
      managerEmail,
      CLIENT.created_at,
    ],
  );
  const clientId = clientRes.rows[0].id;
  console.log("CLIENT", clientId);

  for (const p of PROJECTS) {
    const projRes = await client.query(
      `INSERT INTO projects (
        client_id, organization_id, name, status, progress_pct,
        budget_cents, quoted_cents, gst_cents, project_type,
        manager_user_id, import_key, priority, tags,
        start_date, target_end_date, completed_at,
        delivery_phases, current_phase,
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, 'high', ARRAY['edtech','paata']::text[],
        $12::date, $13::date, $14::timestamptz,
        $15::jsonb, 'launch',
        $16::timestamptz, NOW()
      ) RETURNING id`,
      [
        clientId,
        orgId,
        p.name,
        p.status,
        p.progress_pct,
        inr(p.budget_inr),
        inr(p.quoted_inr),
        inr(p.gst_inr),
        p.project_type,
        managerId,
        p.import_key,
        p.start_date,
        p.target_end_date,
        p.completed_at,
        JSON.stringify([
          { key: "requirements", label: "Requirements", status: "done", progress: 100 },
          { key: "design", label: "Design", status: "done", progress: 100 },
          { key: "development", label: "Development", status: "done", progress: 100 },
          { key: "testing", label: "Testing", status: "done", progress: 100 },
          { key: "launch", label: "Launch", status: "done", progress: 100 },
        ]),
        p.created_at,
      ],
    );
    const projectId = projRes.rows[0].id;
    console.log("PROJECT", p.import_key, projectId);

    for (const m of p.milestones) {
      await client.query(
        `INSERT INTO milestones (project_id, title, completion_pct, status, completed_at, due_at, visibility, "createdAt")
         VALUES ($1, $2, $3, $4, $5::timestamptz, $5::timestamptz, 'client', $5::timestamptz)`,
        [projectId, m.title, m.completion_pct, m.status, m.completed_at],
      );
    }

    for (const inv of p.invoices) {
      const dueAt = `${inv.date}T12:00:00+05:30`;
      const paidAt = `${inv.date}T15:00:00+05:30`;
      const invRes = await client.query(
        `INSERT INTO invoices (
          client_id, project_id, organization_id, invoice_number, status,
          due_at, paid_at, "createdAt", "updatedAt"
        ) VALUES ($1,$2,$3,$4,'paid',$5::timestamptz,$6::timestamptz,$5::timestamptz,NOW())
        RETURNING id`,
        [clientId, projectId, orgId, inv.invoice_number, dueAt, paidAt],
      );
      const invoiceId = invRes.rows[0].id;
      await client.query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_cents, tax_percent, "createdAt")
         VALUES ($1, $2, 1, $3, $4, $5::timestamptz)`,
        [
          invoiceId,
          `${inv.label} — ${p.name}`,
          inr(inv.unit_inr),
          inv.tax_percent,
          dueAt,
        ],
      );
      const total = await recalcInvoice(client, invoiceId);
      console.log("INVOICE", inv.invoice_number, `₹${(total / 100).toLocaleString("en-IN")}`);

      await client.query(
        `INSERT INTO activity_events (
          organization_id, client_id, project_id,
          actor_type, actor_name, event_type, title, body, visibility, created_at
        ) VALUES ($1,$2,$3,'system','Curvvtech','payment_received',$4,$5,'client',$6::timestamptz)`,
        [
          orgId,
          clientId,
          projectId,
          `${inv.label} payment received`,
          `Invoice ${inv.invoice_number} — ₹${(total / 100).toLocaleString("en-IN")}`,
          paidAt,
        ],
      );
    }

    await client.query(
      `INSERT INTO project_activity (project_id, event_type, title, description, created_at)
       VALUES ($1, 'project_completed', $2, 'All milestones delivered and payments received.', $3::timestamptz)`,
      [projectId, `${p.name} completed`, p.completed_at],
    );
  }

  await client.query("COMMIT");
  console.log("SEED_OK");
} catch (e) {
  await client.query("ROLLBACK");
  console.error("SEED_FAILED", e.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
