#!/usr/bin/env node
/**
 * Seed / refresh Tread Trails project task board from the production roadmap.
 * Usage: node scripts/seed-treadtrails-tasks.mjs
 * Requires DATABASE_URL (loads services/api/.env.aws if present).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.aws");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const PROJECT_ID = "02cecd9c-c582-4964-8e2b-078a3e71bc60";

/** @type {Array<{ code: string; phase: string; title: string; status: 'done'|'in_progress'|'todo'; note?: string; priority?: string }>} */
const TASKS = [
  // Phase 0
  { code: "0.1", phase: "Phase 0 — Monorepo & Migration", title: "pnpm workspace + shared packages (shared-types, shared-utils, shared-constants)", status: "done" },
  { code: "0.2", phase: "Phase 0 — Monorepo & Migration", title: "apps/backend — Express, Prisma, layered architecture", status: "done" },
  { code: "0.3", phase: "Phase 0 — Monorepo & Migration", title: "apps/frontend — Next.js storefront split", status: "done" },
  { code: "0.4", phase: "Phase 0 — Monorepo & Migration", title: "apps/admin — Vite console split from template", status: "done" },
  { code: "0.5", phase: "Phase 0 — Monorepo & Migration", title: "Migrate ~76 API routes to backend", status: "done" },
  { code: "0.6", phase: "Phase 0 — Monorepo & Migration", title: "Auth (JWT, CSRF, roles, forgot/reset password)", status: "done" },
  { code: "0.7", phase: "Phase 0 — Monorepo & Migration", title: "Payments — COD, Stripe, Razorpay, Juspay", status: "done" },
  { code: "0.8", phase: "Phase 0 — Monorepo & Migration", title: "CMS, catalog, orders, bookings, leads, CRM", status: "done" },
  { code: "0.9", phase: "Phase 0 — Monorepo & Migration", title: "Stripe webhooks + cron routes", status: "done" },
  { code: "0.10", phase: "Phase 0 — Monorepo & Migration", title: "Monolith cutover — remove root app/, lib/, prisma/", status: "done" },
  { code: "0.11", phase: "Phase 0 — Monorepo & Migration", title: "pnpm dev runs all three apps", status: "done" },
  { code: "0.12", phase: "Phase 0 — Monorepo & Migration", title: "Optional root cleanup (components.json, stale caches)", status: "in_progress", note: "Partial" },
  { code: "0.13", phase: "Phase 0 — Monorepo & Migration", title: "Update MIGRATION_PLAN.md route checkboxes to reflect reality", status: "todo" },
  // Phase 1
  { code: "1.1", phase: "Phase 1 — Production Blockers (P0)", title: "P0-1 Monolith cutover verified (docs/MONOLITH_CUTOVER_REPORT.md)", status: "done" },
  { code: "1.2", phase: "Phase 1 — Production Blockers (P0)", title: "P0-2 Startup env validation (backend + frontend)", status: "done" },
  { code: "1.3", phase: "Phase 1 — Production Blockers (P0)", title: "P0-2 production.env.example + updated .env.example files", status: "done" },
  { code: "1.4", phase: "Phase 1 — Production Blockers (P0)", title: "P0-3 Deployment docs (docs/DEPLOYMENT.md, README.md)", status: "done" },
  { code: "1.5", phase: "Phase 1 — Production Blockers (P0)", title: "P3-1 Remove admin template demo routes (/tables, /notifications, etc.)", status: "done" },
  // Phase 2
  { code: "2.1", phase: "Phase 2 — Automated Testing (P1)", title: "P1-1 Vitest + Supertest infrastructure", status: "done" },
  { code: "2.2", phase: "Phase 2 — Automated Testing (P1)", title: "P1-1 Backend integration tests — auth (16)", status: "done" },
  { code: "2.3", phase: "Phase 2 — Automated Testing (P1)", title: "P1-1 Backend integration tests — orders (9)", status: "done" },
  { code: "2.4", phase: "Phase 2 — Automated Testing (P1)", title: "P1-1 Backend integration tests — products (7)", status: "done" },
  { code: "2.5", phase: "Phase 2 — Automated Testing (P1)", title: "P1-1 Backend integration tests — CMS (8)", status: "done" },
  { code: "2.6", phase: "Phase 2 — Automated Testing (P1)", title: "P1-1 Backend integration tests — bookings (7)", status: "done" },
  { code: "2.7", phase: "Phase 2 — Automated Testing (P1)", title: "P1-1 Backend integration tests — leads (6)", status: "done" },
  { code: "2.8", phase: "Phase 2 — Automated Testing (P1)", title: "P1-1 Backend integration tests — users (8)", status: "done" },
  { code: "2.9", phase: "Phase 2 — Automated Testing (P1)", title: "P1-1 Backend integration tests — health (2)", status: "done" },
  { code: "2.10", phase: "Phase 2 — Automated Testing (P1)", title: "P1-1 pnpm test:backend — 63 tests passing", status: "done" },
  { code: "2.11", phase: "Phase 2 — Automated Testing (P1)", title: "P1-2 Playwright setup + COD checkout E2E", status: "done" },
  { code: "2.12", phase: "Phase 2 — Automated Testing (P1)", title: "P1-2 Stripe checkout E2E (spec exists)", status: "in_progress", note: "Skipped without STRIPE_SECRET_KEY" },
  { code: "2.13", phase: "Phase 2 — Automated Testing (P1)", title: "P1-2 Razorpay checkout E2E (spec exists, stubbed verify)", status: "in_progress", note: "Skipped without Razorpay keys" },
  { code: "2.14", phase: "Phase 2 — Automated Testing (P1)", title: "P1-3 CMS homepage E2E (admin → API → storefront)", status: "done" },
  { code: "2.15", phase: "Phase 2 — Automated Testing (P1)", title: "CI pipeline runs test:backend + E2E on PR", status: "todo", priority: "high" },
  { code: "2.16", phase: "Phase 2 — Automated Testing (P1)", title: "Dedicated test/staging database (not prod Neon)", status: "todo", priority: "high" },
  { code: "2.17", phase: "Phase 2 — Automated Testing (P1)", title: "Update README.md testing section (still says “not implemented”)", status: "todo" },
  // Phase 3
  { code: "3.1", phase: "Phase 3 — Admin & UX Polish (P3)", title: "Profile page redesign (real account API)", status: "done" },
  { code: "3.2", phase: "Phase 3 — Admin & UX Polish (P3)", title: "Analytics dashboard polish", status: "done" },
  { code: "3.3", phase: "Phase 3 — Admin & UX Polish (P3)", title: "Audit Logs + System pages polish", status: "done" },
  { code: "3.4", phase: "Phase 3 — Admin & UX Polish (P3)", title: "P3-2 Error Logs page redesign", status: "todo", note: "Functional but ugly" },
  { code: "3.5", phase: "Phase 3 — Admin & UX Polish (P3)", title: "P3-4 Notification preferences → database", status: "todo", note: "Still localStorage only" },
  // Phase 4
  { code: "4.1", phase: "Phase 4 — Pre-Launch Verification", title: "Production deploy — backend", status: "todo", priority: "high" },
  { code: "4.2", phase: "Phase 4 — Pre-Launch Verification", title: "Production deploy — frontend (Vercel)", status: "todo", priority: "high" },
  { code: "4.3", phase: "Phase 4 — Pre-Launch Verification", title: "Production deploy — admin (static SPA)", status: "todo", priority: "high" },
  { code: "4.4", phase: "Phase 4 — Pre-Launch Verification", title: "DATABASE_URL + migrations on production", status: "todo", priority: "high" },
  { code: "4.5", phase: "Phase 4 — Pre-Launch Verification", title: "JWT_SECRET, CORS_ORIGINS, SITE_URL in prod", status: "todo", priority: "high" },
  { code: "4.6", phase: "Phase 4 — Pre-Launch Verification", title: "BACKEND_API_URL + VITE_API_URL point to live API", status: "todo", priority: "high" },
  { code: "4.7", phase: "Phase 4 — Pre-Launch Verification", title: "REVALIDATE_SECRET aligned backend ↔ frontend", status: "in_progress", note: "Required for CMS E2E; verify in prod" },
  { code: "4.8", phase: "Phase 4 — Pre-Launch Verification", title: "Stripe staging test + live webhook", status: "todo", priority: "high" },
  { code: "4.9", phase: "Phase 4 — Pre-Launch Verification", title: "Razorpay staging test", status: "todo", priority: "high" },
  { code: "4.10", phase: "Phase 4 — Pre-Launch Verification", title: "Resend — domain verified, password reset + contact emails", status: "in_progress", note: "Code ready; prod send not verified" },
  { code: "4.11", phase: "Phase 4 — Pre-Launch Verification", title: "Checkout COD E2E on staging", status: "done", note: "Verified locally" },
  { code: "4.12", phase: "Phase 4 — Pre-Launch Verification", title: "CMS homepage E2E on staging", status: "done", note: "Verified locally" },
  // Phase 5
  { code: "5.1", phase: "Phase 5 — Mobile & QA (P6)", title: "iPhone — checkout flow", status: "todo" },
  { code: "5.2", phase: "Phase 5 — Mobile & QA (P6)", title: "iPhone — booking flow", status: "todo" },
  { code: "5.3", phase: "Phase 5 — Mobile & QA (P6)", title: "Android — checkout + booking", status: "todo" },
  { code: "5.4", phase: "Phase 5 — Mobile & QA (P6)", title: "Tablet layouts", status: "todo" },
  { code: "5.5", phase: "Phase 5 — Mobile & QA (P6)", title: "Lighthouse / performance audit", status: "todo" },
  // Phase 6
  { code: "6.1", phase: "Phase 6 — Operations & Reliability (P7–P8)", title: "Sentry — set SENTRY_DSN in prod", status: "todo", note: "Forwarders exist in code" },
  { code: "6.2", phase: "Phase 6 — Operations & Reliability (P7–P8)", title: "Uptime monitoring on /health", status: "todo" },
  { code: "6.3", phase: "Phase 6 — Operations & Reliability (P7–P8)", title: "Better Stack / log alerts", status: "todo" },
  { code: "6.4", phase: "Phase 6 — Operations & Reliability (P7–P8)", title: "Neon PITR or nightly backups", status: "todo" },
  { code: "6.5", phase: "Phase 6 — Operations & Reliability (P7–P8)", title: "Backup restore drill (staging)", status: "todo" },
  { code: "6.6", phase: "Phase 6 — Operations & Reliability (P7–P8)", title: "Rollback procedure tested", status: "in_progress", note: "Documented, not exercised" },
  // Phase 7
  { code: "7.1", phase: "Phase 7 — Deferred / Post-GA", title: "Admin 2FA", status: "todo", note: "UI placeholder only" },
  { code: "7.2", phase: "Phase 7 — Deferred / Post-GA", title: "Security audit / upload hardening", status: "todo" },
  { code: "7.3", phase: "Phase 7 — Deferred / Post-GA", title: "P5 Shipping provider integration (Shiprocket, etc.)", status: "todo", note: "Manual carrier labels only" },
  { code: "7.4", phase: "Phase 7 — Deferred / Post-GA", title: "Inventory / manual orders QA", status: "todo" },
  { code: "7.5", phase: "Phase 7 — Deferred / Post-GA", title: "GA4 / server-side analytics", status: "todo" },
  { code: "7.6", phase: "Phase 7 — Deferred / Post-GA", title: "Analytics email reports", status: "todo" },
  { code: "7.7", phase: "Phase 7 — Deferred / Post-GA", title: "Portfolio analytics", status: "todo" },
  { code: "7.8", phase: "Phase 7 — Deferred / Post-GA", title: "Fix backend TS errors (vehicles.controller.ts)", status: "todo", note: "Pre-existing, unrelated to features" },
];

function statusLabel(status) {
  if (status === "done") return "✅ Done";
  if (status === "in_progress") return "🟡 Partial";
  return "⬜ Left";
}

function buildDescription(task) {
  const lines = [`${task.phase}`, `Roadmap status: ${statusLabel(task.status)}`];
  if (task.note) lines.push(`Note: ${task.note}`);
  return lines.join("\n");
}

function priorityFor(task) {
  if (task.priority) return task.priority;
  if (task.status === "todo" && task.phase.startsWith("Phase 4")) return "high";
  if (task.status === "in_progress") return "medium";
  if (task.status === "todo") return "medium";
  return "low";
}

async function main() {
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("DATABASE_URL is required");

  const pool = new pg.Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const proj = await client.query(
      `SELECT id, name, organization_id FROM projects WHERE id = $1::uuid`,
      [PROJECT_ID],
    );
    if (!proj.rows[0]) throw new Error(`Project not found: ${PROJECT_ID}`);
    const orgId = proj.rows[0].organization_id;

    // Remove prior roadmap tasks (titles like "0.1 — ...")
    const del = await client.query(
      `DELETE FROM tasks
       WHERE project_id = $1::uuid
         AND (title ~ '^[0-9]+\\.[0-9]+ — ' OR title ~ '^[0-9]{2}\\.[0-9]{2} — ')`,
      [PROJECT_ID],
    );

    let inserted = 0;
    for (const task of TASKS) {
      const [major, minor] = task.code.split(".");
      const sortCode = `${major.padStart(2, "0")}.${minor.padStart(2, "0")}`;
      const title = `${sortCode} — ${task.title}`;
      const description = buildDescription(task);
      const priority = priorityFor(task);
      const completedAt = task.status === "done" ? new Date().toISOString() : null;

      await client.query(
        `INSERT INTO tasks (
           project_id, organization_id, title, description, status, priority, completed_at, "createdAt", "updatedAt"
         ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::timestamptz, NOW(), NOW())`,
        [PROJECT_ID, orgId, title, description, task.status, priority, completedAt],
      );
      inserted++;
    }

    const counts = await client.query(
      `SELECT status, COUNT(*)::int AS n
       FROM tasks WHERE project_id = $1::uuid
       GROUP BY status ORDER BY status`,
      [PROJECT_ID],
    );

    await client.query("COMMIT");

    console.log(`Project: ${proj.rows[0].name}`);
    console.log(`Removed old roadmap tasks: ${del.rowCount}`);
    console.log(`Inserted tasks: ${inserted}`);
    console.log("Status breakdown:", Object.fromEntries(counts.rows.map((r) => [r.status, r.n])));
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
