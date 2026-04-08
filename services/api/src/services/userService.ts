import type pg from "pg";
import { config } from "../config.js";
import type { AuthPayload, InternalUser } from "../types.js";

export async function ensureUser(
  db: pg.Pool,
  auth: AuthPayload
): Promise<InternalUser> {
  const email = auth.email?.trim() || null;

  const existing = await db.query(
    `SELECT id, auth_sub, email, access_allowed, waitlist_position
     FROM users WHERE auth_sub = $1`,
    [auth.sub]
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as {
      id: string;
      auth_sub: string;
      email: string | null;
      access_allowed: boolean;
      waitlist_position: number | null;
    };
    if (email && email !== row.email) {
      await db.query(`UPDATE users SET email = COALESCE($2, email), updated_at = now() WHERE id = $1`, [
        row.id,
        email,
      ]);
    }
    return {
      id: row.id,
      authSub: row.auth_sub,
      email: email || row.email,
      accessAllowed: row.access_allowed,
      waitlistPosition: row.waitlist_position,
    };
  }

  const countR = await db.query(`SELECT COUNT(*)::int AS c FROM users`);
  const count = (countR.rows[0] as { c: number }).c;
  const accessAllowed = count < config.accessCap;
  const waitlistPosition = accessAllowed ? null : count + 1;

  const ins = await db.query(
    `INSERT INTO users (auth_sub, email, access_allowed, waitlist_position)
     VALUES ($1, $2, $3, $4)
     RETURNING id, auth_sub, email, access_allowed, waitlist_position`,
    [auth.sub, email, accessAllowed, waitlistPosition]
  );

  const row = ins.rows[0] as {
    id: string;
    auth_sub: string;
    email: string | null;
    access_allowed: boolean;
    waitlist_position: number | null;
  };

  return {
    id: row.id,
    authSub: row.auth_sub,
    email: row.email,
    accessAllowed: row.access_allowed,
    waitlistPosition: row.waitlist_position,
  };
}
