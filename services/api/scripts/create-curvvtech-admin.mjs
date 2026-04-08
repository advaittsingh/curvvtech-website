/**
 * One-time: create or upgrade a CurvvTech dashboard admin (JWT + password).
 *
 * Usage (never commit passwords):
 *   DATABASE_URL="postgresql://..." ADMIN_EMAIL="you@domain.com" ADMIN_PASSWORD="..." node scripts/create-curvvtech-admin.mjs
 *
 * Or load DATABASE_URL from .env.aws in this directory:
 *   DOTENV_CONFIG_PATH=.env.aws ADMIN_EMAIL=... ADMIN_PASSWORD=... node -r dotenv/config scripts/create-curvvtech-admin.mjs
 */

import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.aws") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const email = String(process.env.ADMIN_EMAIL || "")
  .trim()
  .toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";
const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  console.error("Missing DATABASE_URL (set it or use .env.aws).");
  process.exit(1);
}
if (!email || !email.includes("@")) {
  console.error("Set ADMIN_EMAIL to a valid email.");
  process.exit(1);
}
if (password.length < 6) {
  console.error("ADMIN_PASSWORD must be at least 6 characters.");
  process.exit(1);
}

async function ensureTenant(client, userId, em) {
  const has = await client.query(
    `SELECT 1 FROM tenant_users WHERE user_id = $1::uuid LIMIT 1`,
    [userId]
  );
  if (has.rowCount > 0) return;

  const slug = `org-${userId.replace(/-/g, "")}`;
  const name = em?.trim() || "Organization";
  let insT = await client.query(
    `INSERT INTO tenants (name, slug) VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET updated_at = now()
     RETURNING id::text`,
    [name, slug]
  );
  let tid = insT.rows[0]?.id;
  if (!tid) {
    const r = await client.query(`SELECT id::text FROM tenants WHERE slug = $1`, [slug]);
    tid = r.rows[0]?.id;
  }
  if (!tid) return;
  await client.query(
    `INSERT INTO tenant_users (tenant_id, user_id, role) VALUES ($1::uuid, $2::uuid, 'admin')
     ON CONFLICT DO NOTHING`,
    [tid, userId]
  );
}

const pool = new pg.Pool({ connectionString });
const hash = await bcrypt.hash(password, 12);

const client = await pool.connect();
try {
  await client.query("BEGIN");
  const existing = await client.query(
    `SELECT id::text FROM users WHERE lower(trim(email)) = $1 LIMIT 1`,
    [email]
  );
  let userId;
  if (existing.rows[0]) {
    userId = existing.rows[0].id;
    await client.query(
      `UPDATE users
       SET password_hash = $2,
           curvvtech_role = 'admin',
           access_allowed = true,
           waitlist_position = NULL,
           updated_at = now()
       WHERE id = $1::uuid`,
      [userId, hash]
    );
    console.log("Updated existing user: admin role + password set.");
  } else {
    const authSub = `pw:${crypto.randomUUID()}`;
    const ins = await client.query(
      `INSERT INTO users (auth_sub, email, password_hash, access_allowed, waitlist_position, curvvtech_role)
       VALUES ($1, $2, $3, true, NULL, 'admin')
       RETURNING id::text`,
      [authSub, email, hash]
    );
    userId = ins.rows[0].id;
    console.log("Created new admin user.");
  }
  await ensureTenant(client, userId, email);
  await client.query("COMMIT");
  console.log("Done. Sign in at the admin panel with this email and password.");
} catch (e) {
  await client.query("ROLLBACK");
  console.error(e);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
