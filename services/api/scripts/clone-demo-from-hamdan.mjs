#!/usr/bin/env node
/**
 * Clone client:hamdan-pathan → client:demo-portal with portal login.
 * Usage: node scripts/clone-demo-from-hamdan.mjs --env .env.aws
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import pg from "pg";
import bcrypt from "bcryptjs";

const envArgIdx = process.argv.indexOf("--env");
config({ path: resolve(envArgIdx > -1 ? process.argv[envArgIdx + 1] : ".env.aws") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const SRC_KEY = "client:hamdan-pathan";
const DEMO_KEY = "client:demo-portal";
const DEMO_EMAIL = "demo@curvvtech.in";
const DEMO_PASSWORD = "DemoPortal123!";

const db = await pool.connect();
try {
  await db.query("BEGIN");

  const existing = await db.query(`SELECT id FROM clients WHERE import_key = $1`, [DEMO_KEY]);
  if (existing.rows[0]) {
    console.log("SKIP demo client already exists:", existing.rows[0].id);
    await db.query("ROLLBACK");
    process.exit(0);
  }

  const src = (await db.query(`SELECT * FROM clients WHERE import_key = $1`, [SRC_KEY])).rows[0];
  if (!src) throw new Error(`Source client ${SRC_KEY} not found`);

  const demoClient = (await db.query(
    `INSERT INTO clients (
      name, email, phone, company, industry, website, gst_number, address,
      contract_value_cents, status, notes, contract_notes, account_manager_id,
      portal_status, import_key, referred_by, organization_id, "createdAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13,
      'active', $14, $15, $16, $17, NOW()
    ) RETURNING id`,
    [
      "Demo Client",
      DEMO_EMAIL,
      "+91 90000 00001",
      "Demo Workspace",
      src.industry,
      src.website,
      src.gst_number,
      "Preview account — cloned from Hamdan Pathan",
      src.contract_value_cents,
      "active",
      "Demo / preview client portal account. Mirrors Hamdan Pathan projects (YBT + Sanveda).",
      src.contract_notes,
      src.account_manager_id,
      DEMO_KEY,
      src.referred_by,
      src.organization_id,
      src.createdAt,
    ],
  )).rows[0].id;

  const pwHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  await db.query(
    `INSERT INTO client_users (organization_id, client_id, email, password_hash, name, phone, role, status, last_login_at)
     VALUES ($1, $2, $3, $4, 'Demo Client', $5, 'owner', 'active', NULL)`,
    [src.organization_id, demoClient, DEMO_EMAIL, pwHash, "+91 90000 00001"],
  );

  const srcProjects = (await db.query(`SELECT * FROM projects WHERE client_id = $1 ORDER BY "createdAt"`, [src.id])).rows;
  const projectMap = new Map();

  for (const p of srcProjects) {
    const newKey = p.import_key?.replace("project:", "project:demo-") ?? `project:demo-${p.id.slice(0, 8)}`;
    const row = (await db.query(
      `INSERT INTO projects (
        client_id, organization_id, name, status, progress_pct, budget_cents, quoted_cents, gst_cents,
        project_type, manager_user_id, import_key, priority, tags, color, live_url, repository_url, figma_url,
        start_date, target_end_date, completed_at, internal_notes, delivery_phases, current_phase,
        ai_intelligence, metadata, referred_by, is_internal, "createdAt", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22::jsonb,$23,$24::jsonb,$25::jsonb,$26,$27,$28,NOW()
      ) RETURNING id`,
      [
        demoClient,
        p.organization_id,
        p.name,
        p.status,
        p.progress_pct,
        p.budget_cents,
        p.quoted_cents,
        p.gst_cents,
        p.project_type,
        p.manager_user_id,
        newKey,
        p.priority,
        p.tags,
        p.color,
        p.live_url,
        p.repository_url,
        p.figma_url,
        p.start_date,
        p.target_end_date,
        p.completed_at,
        p.internal_notes,
        JSON.stringify(p.delivery_phases ?? []),
        p.current_phase,
        p.ai_intelligence ? JSON.stringify(p.ai_intelligence) : null,
        JSON.stringify(p.metadata ?? {}),
        p.referred_by,
        p.is_internal,
        p.createdAt,
      ],
    )).rows[0];
    projectMap.set(p.id, row.id);
  }

  for (const [oldPid, newPid] of projectMap) {
    const milestones = await db.query(`SELECT * FROM milestones WHERE project_id = $1`, [oldPid]);
    for (const m of milestones.rows) {
      await db.query(
        `INSERT INTO milestones (project_id, title, description, completion_pct, status, due_at, completed_at, visibility, published_at, "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [newPid, m.title, m.description, m.completion_pct, m.status, m.due_at, m.completed_at, m.visibility, m.published_at, m.createdAt],
      );
    }

    const tasks = await db.query(`SELECT * FROM tasks WHERE project_id = $1`, [oldPid]);
    for (const t of tasks.rows) {
      await db.query(
        `INSERT INTO tasks (project_id, organization_id, title, description, status, priority, assignee_user_id, due_at, completed_at, visibility, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
        [newPid, t.organization_id, t.title, t.description, t.status, t.priority, t.assignee_user_id, t.due_at, t.completed_at, t.visibility, t.createdAt],
      );
    }

    const pa = await db.query(`SELECT * FROM project_activity WHERE project_id = $1`, [oldPid]);
    for (const a of pa.rows) {
      await db.query(
        `INSERT INTO project_activity (project_id, event_type, title, description, metadata, actor_user_id, created_at)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)`,
        [newPid, a.event_type, a.title, a.description, JSON.stringify(a.metadata ?? {}), a.actor_user_id, a.created_at],
      );
    }

    const folders = await db.query(`SELECT * FROM file_folders WHERE project_id = $1`, [oldPid]);
    const folderMap = new Map();
    for (const f of folders.rows) {
      const nf = (await db.query(
        `INSERT INTO file_folders (name, parent_id, client_id, project_id, folder_kind, created_by_user_id, "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [f.name, null, demoClient, newPid, f.folder_kind, f.created_by_user_id, f.createdAt],
      )).rows[0];
      folderMap.set(f.id, nf.id);
    }
    // fix parent_id after all folders inserted
    for (const f of folders.rows) {
      if (f.parent_id && folderMap.has(f.parent_id) && folderMap.has(f.id)) {
        await db.query(`UPDATE file_folders SET parent_id = $1 WHERE id = $2`, [folderMap.get(f.parent_id), folderMap.get(f.id)]);
      }
    }

    const invoices = await db.query(`SELECT * FROM invoices WHERE project_id = $1`, [oldPid]);
    for (const inv of invoices.rows) {
      const newNum = inv.invoice_number?.startsWith("INV-")
        ? inv.invoice_number.replace("INV-", "INV-DEMO-")
        : `INV-DEMO-${inv.invoice_number}`;
      const newInv = (await db.query(
        `INSERT INTO invoices (
          client_id, project_id, organization_id, invoice_number, status,
          amount_cents, tax_cents, discount_cents, subtotal_cents, total_cents,
          due_at, paid_at, payment_link, razorpay_order_id, "createdAt", "updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW()) RETURNING id`,
        [
          demoClient,
          newPid,
          inv.organization_id,
          newNum,
          inv.status,
          inv.amount_cents,
          inv.tax_cents,
          inv.discount_cents,
          inv.subtotal_cents,
          inv.total_cents,
          inv.due_at,
          inv.paid_at,
          inv.payment_link,
          inv.razorpay_order_id,
          inv.createdAt,
        ],
      )).rows[0].id;

      const items = await db.query(`SELECT * FROM invoice_items WHERE invoice_id = $1`, [inv.id]);
      for (const it of items.rows) {
        await db.query(
          `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_cents, tax_percent, discount_cents, "createdAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [newInv, it.description, it.quantity, it.unit_price_cents, it.tax_percent, it.discount_cents, it.createdAt],
        );
      }
    }
  }

  const activities = await db.query(`SELECT * FROM activity_events WHERE client_id = $1`, [src.id]);
  for (const a of activities.rows) {
    const newPid = a.project_id ? projectMap.get(a.project_id) ?? null : null;
    await db.query(
      `INSERT INTO activity_events (
        organization_id, client_id, project_id, actor_type, actor_id, actor_name,
        event_type, entity_type, entity_id, title, body, metadata_json, visibility, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14)`,
      [
        a.organization_id,
        demoClient,
        newPid,
        a.actor_type,
        a.actor_id,
        a.actor_name,
        a.event_type,
        a.entity_type,
        a.entity_id,
        a.title,
        a.body,
        JSON.stringify(a.metadata_json ?? {}),
        a.visibility,
        a.created_at,
      ],
    );
  }

  await db.query("COMMIT");

  const summary = await pool.query(
    `SELECT
      (SELECT COUNT(*)::int FROM projects WHERE client_id = $1) AS projects,
      (SELECT COUNT(*)::int FROM milestones m JOIN projects p ON p.id=m.project_id WHERE p.client_id=$1) AS milestones,
      (SELECT COUNT(*)::int FROM tasks t JOIN projects p ON p.id=t.project_id WHERE p.client_id=$1) AS tasks,
      (SELECT COUNT(*)::int FROM invoices WHERE client_id=$1) AS invoices,
      (SELECT COUNT(*)::int FROM activity_events WHERE client_id=$1) AS activity`,
    [demoClient],
  );

  console.log("DEMO_CLIENT", demoClient);
  console.log("LOGIN", DEMO_EMAIL, "/", DEMO_PASSWORD);
  console.log("SUMMARY", summary.rows[0]);
  console.log("CLONE_OK");
} catch (e) {
  await db.query("ROLLBACK");
  console.error("CLONE_FAILED", e.message);
  process.exit(1);
} finally {
  db.release();
  await pool.end();
}
