import { neon } from '@neondatabase/serverless'

type Sql = ReturnType<typeof neon>

type AuthPayload = { sub: string; email?: string | null }

function accessCap() {
  const v = process.env.ACCESS_CAP
  const n = v ? Number.parseInt(v, 10) : 1000
  return Number.isFinite(n) ? n : 1000
}

export type InternalUser = {
  id: string
  email: string | null
  accessAllowed: boolean
  waitlistPosition: number | null
}

/** Same rules as the FollowUp API `ensureUser` (Neon / Postgres). */
export async function ensureUser(sql: Sql, auth: AuthPayload): Promise<InternalUser> {
  const email = auth.email?.trim() || null

  const existing = (await sql`
    SELECT id, auth_sub, email, access_allowed, waitlist_position
    FROM users WHERE auth_sub = ${auth.sub}
  `) as {
    id: string
    auth_sub: string
    email: string | null
    access_allowed: boolean
    waitlist_position: number | null
  }[]

  const row0 = existing[0]

  if (row0) {
    if (email && email !== row0.email) {
      await sql`
        UPDATE users SET email = ${email}, updated_at = now() WHERE id = ${row0.id}
      `
    }
    return {
      id: row0.id,
      email: email || row0.email,
      accessAllowed: row0.access_allowed,
      waitlistPosition: row0.waitlist_position,
    }
  }

  const countRows = (await sql`SELECT COUNT(*)::int AS c FROM users`) as { c: number }[]
  const count = Number(countRows[0]?.c)
  const cap = accessCap()
  const accessAllowed = count < cap
  const waitlistPosition = accessAllowed ? null : count + 1

  const ins = (await sql`
    INSERT INTO users (auth_sub, email, access_allowed, waitlist_position)
    VALUES (${auth.sub}, ${email}, ${accessAllowed}, ${waitlistPosition})
    RETURNING id, email, access_allowed, waitlist_position
  `) as {
    id: string
    email: string | null
    access_allowed: boolean
    waitlist_position: number | null
  }[]

  const row = ins[0]
  if (!row) {
    throw new Error('Failed to create user')
  }

  return {
    id: row.id,
    email: row.email,
    accessAllowed: row.access_allowed,
    waitlistPosition: row.waitlist_position,
  }
}
