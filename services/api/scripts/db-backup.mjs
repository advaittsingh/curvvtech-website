#!/usr/bin/env node
/**
 * Version-independent logical backup: dumps every row of every table in the
 * public schema to a single JSON file. Restorable via db-restore.mjs.
 * Usage: node scripts/db-backup.mjs [--env .env.aws]
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import pg from "pg";

const envArgIdx = process.argv.indexOf("--env");
const envPath = envArgIdx > -1 ? process.argv[envArgIdx + 1] : ".env.aws";
config({ path: resolve(envPath) });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });

const tablesRes = await pool.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`,
);
const tables = tablesRes.rows.map((r) => r.table_name);

const dump = { takenAt: new Date().toISOString(), server: connectionString.replace(/:[^:@/]+@/, ":***@"), tables: {} };
let total = 0;
for (const t of tables) {
  const r = await pool.query(`SELECT * FROM "${t}"`);
  dump.tables[t] = r.rows;
  total += r.rows.length;
}

const dir = resolve("backups");
await mkdir(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = resolve(dir, `backup-${stamp}.json`);
await writeFile(file, JSON.stringify(dump), "utf8");

console.log(`BACKUP_OK tables=${tables.length} rows=${total}`);
console.log(`FILE ${file}`);
await pool.end();
