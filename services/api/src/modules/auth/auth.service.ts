import crypto from "node:crypto";
import type pg from "pg";
import { config } from "../../config.js";
import { AppError, badRequest, conflict, unauthorized } from "../../lib/errors.js";
import type { InternalUser } from "../../types.js";
import {
  createRefreshPlain,
  hashPassword,
  hashRefreshToken,
  signAccessToken,
  verifyPassword,
  verifyRefreshPlain,
} from "./auth.tokens.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: "Bearer";
};

async function ensureTenantForUser(client: pg.PoolClient, userId: string, email: string | null): Promise<void> {
  const has = await client.query(`SELECT 1 FROM tenant_users WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  if (has.rowCount && has.rowCount > 0) return;

  const slug = `org-${userId.replace(/-/g, "")}`;
  const name = email?.trim() || "Organization";
  const insT = await client.query<{ id: string }>(
    `INSERT INTO tenants (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET updated_at = now() RETURNING id::text`,
    [name, slug]
  );
  let tid = insT.rows[0]?.id;
  if (!tid) {
    const r = await client.query<{ id: string }>(`SELECT id::text FROM tenants WHERE slug = $1`, [slug]);
    tid = r.rows[0]?.id;
  }
  if (!tid) return;
  await client.query(
    `INSERT INTO tenant_users (tenant_id, user_id, role) VALUES ($1::uuid, $2::uuid, 'admin')
     ON CONFLICT DO NOTHING`,
    [tid, userId]
  );
}

function rowToInternalUser(row: {
  id: string;
  auth_sub: string;
  email: string | null;
  access_allowed: boolean;
  waitlist_position: number | null;
}): InternalUser {
  return {
    id: row.id,
    authSub: row.auth_sub,
    email: row.email,
    accessAllowed: row.access_allowed,
    waitlistPosition: row.waitlist_position,
  };
}

async function issueSession(
  pool: pg.Pool,
  userId: string,
  email: string | null
): Promise<AuthTokens> {
  if (!config.skipAuth && !config.jwtAccessSecret?.trim()) {
    throw new AppError(503, "INTERNAL", "Authentication is not configured (JWT_SECRET is missing)");
  }
  const plainRefresh = createRefreshPlain(userId);
  const refreshHash = await hashRefreshToken(plainRefresh);
  const expAt = new Date(Date.now() + config.jwtRefreshExpiresSec * 1000);

  await pool.query(
    `UPDATE users SET refresh_token_hash = $2, refresh_token_expires_at = $3, updated_at = now() WHERE id = $1::uuid`,
    [userId, refreshHash, expAt]
  );

  const access = signAccessToken(userId, email, config.jwtAccessSecret, config.jwtAccessExpiresSec);
  return {
    access_token: access,
    refresh_token: plainRefresh,
    expires_in: config.jwtAccessExpiresSec,
    token_type: "Bearer",
  };
}

export async function signupWithPassword(
  pool: pg.Pool,
  emailRaw: string,
  password: string
): Promise<{ user: InternalUser; tokens: AuthTokens }> {
  const email = normalizeEmail(emailRaw);
  if (!email || !email.includes("@")) {
    throw badRequest("Valid email is required");
  }
  if (password.length < 6) {
    throw badRequest("Password must be at least 6 characters");
  }

  const dup = await pool.query(`SELECT id FROM users WHERE lower(trim(email)) = $1 LIMIT 1`, [email]);
  if (dup.rowCount && dup.rowCount > 0) {
    throw conflict("An account with this email already exists");
  }

  const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM users`);
  const count = (countR.rows[0] as { c: number }).c;
  const accessAllowed = count < config.accessCap;
  const waitlistPosition = accessAllowed ? null : count + 1;

  const passwordHash = await hashPassword(password);
  const authSub = `pw:${crypto.randomUUID()}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query<{
      id: string;
      auth_sub: string;
      email: string | null;
      access_allowed: boolean;
      waitlist_position: number | null;
    }>(
      `INSERT INTO users (auth_sub, email, password_hash, access_allowed, waitlist_position)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, auth_sub, email, access_allowed, waitlist_position`,
      [authSub, email, passwordHash, accessAllowed, waitlistPosition]
    );
    const row = ins.rows[0]!;
    await ensureTenantForUser(client, row.id, row.email);
    await client.query("COMMIT");

    const tokens = await issueSession(pool, row.id, row.email);
    return { user: rowToInternalUser(row), tokens };
  } catch (e) {
    await client.query("ROLLBACK");
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505") {
      throw conflict("An account with this email already exists");
    }
    throw e;
  } finally {
    client.release();
  }
}

export async function loginWithPassword(
  pool: pg.Pool,
  emailRaw: string,
  password: string
): Promise<{ user: InternalUser; tokens: AuthTokens }> {
  const email = normalizeEmail(emailRaw);
  const r = await pool.query<{
    id: string;
    auth_sub: string;
    email: string | null;
    access_allowed: boolean;
    waitlist_position: number | null;
    password_hash: string | null;
  }>(
    `SELECT id, auth_sub, email, access_allowed, waitlist_position, password_hash
     FROM users WHERE lower(trim(email)) = $1 AND password_hash IS NOT NULL LIMIT 1`,
    [email]
  );
  const row = r.rows[0];
  if (!row) {
    throw unauthorized("Invalid email or password");
  }
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) {
    throw unauthorized("Invalid email or password");
  }

  const tokens = await issueSession(pool, row.id, row.email);
  return {
    user: rowToInternalUser({
      id: row.id,
      auth_sub: row.auth_sub,
      email: row.email,
      access_allowed: row.access_allowed,
      waitlist_position: row.waitlist_position,
    }),
    tokens,
  };
}

export async function refreshSession(pool: pg.Pool, refreshPlain: string): Promise<AuthTokens> {
  const dot = refreshPlain.indexOf(".");
  if (dot < 36) {
    throw unauthorized("Invalid refresh token");
  }
  const userId = refreshPlain.slice(0, dot);
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    throw unauthorized("Invalid refresh token");
  }

  const r = await pool.query<{
    id: string;
    email: string | null;
    refresh_token_hash: string | null;
    refresh_token_expires_at: Date | null;
  }>(
    `SELECT id::text, email, refresh_token_hash, refresh_token_expires_at
     FROM users WHERE id = $1::uuid LIMIT 1`,
    [userId]
  );
  const row = r.rows[0];
  if (!row?.refresh_token_hash || !row.refresh_token_expires_at) {
    throw unauthorized("Invalid refresh token");
  }
  if (new Date(row.refresh_token_expires_at) < new Date()) {
    throw unauthorized("Refresh token expired");
  }

  const match = await verifyRefreshPlain(refreshPlain, row.refresh_token_hash);
  if (!match) {
    throw unauthorized("Invalid refresh token");
  }

  return issueSession(pool, row.id, row.email);
}

export async function logoutUser(pool: pg.Pool, userId: string): Promise<void> {
  await pool.query(
    `UPDATE users SET refresh_token_hash = NULL, refresh_token_expires_at = NULL, updated_at = now() WHERE id = $1::uuid`,
    [userId]
  );
}

export async function getUserById(pool: pg.Pool, userId: string): Promise<InternalUser | null> {
  const r = await pool.query<{
    id: string;
    auth_sub: string;
    email: string | null;
    access_allowed: boolean;
    waitlist_position: number | null;
  }>(
    `SELECT id, auth_sub, email, access_allowed, waitlist_position FROM users WHERE id = $1::uuid LIMIT 1`,
    [userId]
  );
  const row = r.rows[0];
  return row ? rowToInternalUser(row) : null;
}
