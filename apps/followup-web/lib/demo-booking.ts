import { Pool } from '@neondatabase/serverless'

import { isOnOrAfterDemoBookingStart, minDemoBookingYmd } from '#lib/demo-booking-dates'
import { getConnectionString, getSql } from '#lib/neon'

export { minDemoBookingYmd } from '#lib/demo-booking-dates'

/** Wall-clock slot times (Mon–Fri); matches services/api demo module. */
export const DEMO_SLOT_TIMES = [
  '09:00:00',
  '09:30:00',
  '10:00:00',
  '10:30:00',
  '11:00:00',
  '11:30:00',
  '12:00:00',
  '12:30:00',
  '13:00:00',
  '13:30:00',
  '14:00:00',
  '14:30:00',
  '15:00:00',
  '15:30:00',
  '16:00:00',
  '16:30:00',
] as const

const DEMO_SLOT_TIME_SET = new Set<string>(DEMO_SLOT_TIMES as unknown as string[])

const YMD = /^\d{4}-\d{2}-\d{2}$/
const HM = /^([01]\d|2[0-3]):[0-5]\d$/

export type DemoSlotRow = {
  id: string
  date: string
  time: string
  is_booked: boolean
}

function isValidYmd(s: string): boolean {
  if (!YMD.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export function isWeekdayYmd(ymd: string): boolean {
  const [y, m, d] = ymd.split('-').map(Number)
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return wd >= 1 && wd <= 5
}

function formatTimeFromDb(t: unknown): string {
  const s = String(t)
  if (s.length >= 5) return s.slice(0, 5)
  return s
}

export async function ensureDemoSlotsForDate(dateYmd: string): Promise<void> {
  if (!isValidYmd(dateYmd) || !isWeekdayYmd(dateYmd)) return
  const sql = getSql()
  for (const t of DEMO_SLOT_TIMES) {
    await sql`
      INSERT INTO demo_slots (date, "time", is_booked)
      VALUES (${dateYmd}::date, ${t}::time, false)
      ON CONFLICT (date, "time") DO NOTHING
    `
  }
}

export async function listAvailableDemoSlots(dateYmd: string): Promise<DemoSlotRow[]> {
  if (!isValidYmd(dateYmd)) return []
  if (!isOnOrAfterDemoBookingStart(dateYmd)) return []
  if (!isWeekdayYmd(dateYmd)) return []
  await ensureDemoSlotsForDate(dateYmd)
  const sql = getSql()
  const rows = (await sql`
    SELECT id, date::text AS date, "time"::text AS "time", is_booked
    FROM demo_slots
    WHERE date = ${dateYmd}::date AND is_booked = false
    ORDER BY "time"
  `) as DemoSlotRow[]
  return rows.map((r) => ({
    ...r,
    time: formatTimeFromDb(r.time),
  }))
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type BookDemoInput = {
  date: string
  time: string
  name: string
  email: string
  phone?: string | null
  company?: string | null
}

function normalizeTimeHm(t: string): string | null {
  const x = String(t).trim()
  if (!HM.test(x)) return null
  return `${x}:00`
}

export function validateBookDemoBody(body: unknown):
  | { ok: true; data: BookDemoInput }
  | { ok: false; message: string } {
  if (!body || typeof body !== 'object')
    return { ok: false, message: 'Invalid JSON body' }
  const o = body as Record<string, unknown>
  const date = typeof o.date === 'string' ? o.date.trim() : ''
  const timeRaw = typeof o.time === 'string' ? o.time.trim() : ''
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  const email = typeof o.email === 'string' ? o.email.trim().toLowerCase() : ''
  const phone = typeof o.phone === 'string' ? o.phone.trim().slice(0, 40) : null
  const company =
    typeof o.company === 'string' ? o.company.trim().slice(0, 200) : null

  if (!isValidYmd(date)) return { ok: false, message: 'Invalid date' }
  if (!isOnOrAfterDemoBookingStart(date)) {
    return {
      ok: false,
      message: 'Demos can be booked from 10 April onward. Choose a later date.',
    }
  }
  if (!isWeekdayYmd(date)) return { ok: false, message: 'No demos on weekends' }
  const timeNorm = normalizeTimeHm(timeRaw)
  if (!timeNorm || !DEMO_SLOT_TIME_SET.has(timeNorm)) {
    return { ok: false, message: 'Invalid time slot' }
  }
  if (name.length < 1 || name.length > 200)
    return { ok: false, message: 'Name is required' }
  if (!EMAIL_RE.test(email)) return { ok: false, message: 'Invalid email' }
  return {
    ok: true,
    data: {
      date,
      time: timeNorm,
      name,
      email,
      phone: phone || null,
      company: company || null,
    },
  }
}

let pool: Pool | null = null

function getPool(): Pool {
  const connectionString = getConnectionString()
  if (!connectionString) {
    const err = new Error('MISSING_DATABASE_ENV')
    err.name = 'MissingDatabaseEnv'
    throw err
  }
  if (!pool) pool = new Pool({ connectionString })
  return pool
}

export async function bookDemoSlotTransactional(
  input: BookDemoInput,
): Promise<
  | {
      ok: true
      booking: { id: string; date: string; time: string; status: string }
    }
  | { ok: false; code: 'SLOT_TAKEN' | 'DB_ERROR'; message: string }
> {
  const pg = getPool()
  const client = await pg.connect()
  try {
    await client.query('BEGIN')
    for (const t of DEMO_SLOT_TIMES) {
      await client.query(
        `INSERT INTO demo_slots (date, "time", is_booked)
         VALUES ($1::date, $2::time, false)
         ON CONFLICT (date, "time") DO NOTHING`,
        [input.date, t],
      )
    }
    const upd = await client.query<{ id: string }>(
      `UPDATE demo_slots
       SET is_booked = true
       WHERE date = $1::date AND "time" = $2::time AND is_booked = false
       RETURNING id`,
      [input.date, input.time],
    )
    if (upd.rowCount === 0) {
      await client.query('ROLLBACK')
      return {
        ok: false,
        code: 'SLOT_TAKEN',
        message: 'This time was just booked. Pick another slot.',
      }
    }
    const slotId = upd.rows[0]!.id
    const ins = await client.query<{
      id: string
      date: string
      time: string
      status: string
    }>(
      `INSERT INTO demo_requests (slot_id, name, email, phone, company, date, "time", status)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::date, $7::time, 'pending')
       RETURNING id, date::text, "time"::text, status`,
      [
        slotId,
        input.name,
        input.email,
        input.phone,
        input.company,
        input.date,
        input.time,
      ],
    )
    await client.query('COMMIT')
    const row = ins.rows[0]!
    return {
      ok: true,
      booking: {
        id: row.id,
        date: row.date,
        time: formatTimeFromDb(row.time),
        status: row.status,
      },
    }
  } catch (e) {
    await client.query('ROLLBACK')
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, code: 'DB_ERROR', message: msg }
  } finally {
    client.release()
  }
}
