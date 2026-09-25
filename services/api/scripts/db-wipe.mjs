#!/usr/bin/env node
/**
 * DESTRUCTIVE: truncates all customer/CRM data while preserving login, config,
 * CMS, HR, SOP, WhatsApp and staff tables (see KEEP list). Keeps the schema.
 * Requires --yes to actually run. Usage:
 *   node scripts/db-wipe.mjs --env .env.aws --yes
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import pg from "pg";

const args = process.argv.slice(2);
const envArgIdx = args.indexOf("--env");
const envPath = envArgIdx > -1 ? args[envArgIdx + 1] : ".env.aws";
const confirmed = args.includes("--yes");
config({ path: resolve(envPath) });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

/** Tables whose ROWS are preserved. Everything else is truncated. */
const KEEP = new Set([
  // required + login + config
  "schema_migrations",
  "users",
  "user_profiles",
  "roles",
  "organizations",
  "company_settings",
  // HR / payroll
  "business_profiles",
  "compensation_profiles",
  "payroll_runs",
  "payroll_entries",
  // internal SOPs
  "sops",
  "sop_steps",
  // Business OS seed
  "bos_agent_definitions",
  // marketing website CMS (public site content)
  "cms_sites",
  "cms_pages",
  "cms_services",
  "cms_components",
  "cms_theme",
  "cms_media",
  "cms_team_members",
  // WhatsApp / tenant integration
  "tenants",
  "tenant_users",
  "whatsapp_accounts",
  "wa_conversations",
  "wa_leads",
  "wa_messages",
]);

const pool = new pg.Pool({ connectionString });

const tablesRes = await pool.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`,
);
const all = tablesRes.rows.map((r) => r.table_name);
const wipe = all.filter((t) => !KEEP.has(t));

// Safety: verify no KEPT table has a FK pointing at a table we're about to wipe
// (would make CASCADE reach into preserved data).
const fk = await pool.query(`
  SELECT tc.table_name AS child, ccu.table_name AS parent
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public'
  GROUP BY tc.table_name, ccu.table_name`);
const wipeSet = new Set(wipe);
const dangerous = fk.rows.filter((r) => KEEP.has(r.child) && wipeSet.has(r.parent));
if (dangerous.length) {
  console.error("ABORT: kept tables reference tables being wiped (cascade would delete kept data):");
  for (const d of dangerous) console.error(`  ${d.child} -> ${d.parent}`);
  process.exit(1);
}

console.log(`KEEP ${KEEP.size} tables | WIPE ${wipe.length} tables`);
if (!confirmed) {
  console.log("DRY RUN (pass --yes to execute). Tables that would be wiped:");
  console.log(wipe.join(", "));
  await pool.end();
  process.exit(0);
}

const client = await pool.connect();
try {
  await client.query("BEGIN");
  const idents = wipe.map((t) => `"${t}"`).join(", ");
  await client.query(`TRUNCATE ${idents} RESTART IDENTITY CASCADE`);
  await client.query("COMMIT");
  console.log(`WIPE_OK truncated=${wipe.length}`);
} catch (e) {
  await client.query("ROLLBACK");
  console.error("WIPE_FAILED", e.message);
  process.exit(1);
} finally {
  client.release();
}

// Verify
const check = await pool.query(
  `SELECT '${[...KEEP].join("','")}' AS x`,
);
void check;
let keptRows = 0;
for (const t of KEEP) {
  const r = await pool.query(`SELECT COUNT(*)::int c FROM "${t}"`);
  keptRows += r.rows[0].c;
}
let wipedRows = 0;
for (const t of wipe) {
  const r = await pool.query(`SELECT COUNT(*)::int c FROM "${t}"`);
  wipedRows += r.rows[0].c;
}
console.log(`VERIFY kept_rows=${keptRows} wiped_rows_remaining=${wipedRows}`);
await pool.end();
