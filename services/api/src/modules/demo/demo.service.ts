import { pool } from "../../db.js";
import { firstRow, sql } from "../../lib/sqlPool.js";
import { maybeSendDemoConfirmationInvite } from "./demoCalendarMail.js";

export class DemoStatusTransitionError extends Error {
  override name = "DemoStatusTransitionError";
  constructor(message: string) {
    super(message);
  }
}

/** Wall-clock slot times (same calendar day as `date`); Mon–Fri only. */
export const DEMO_SLOT_TIMES = [
  "09:00:00",
  "09:30:00",
  "10:00:00",
  "10:30:00",
  "11:00:00",
  "11:30:00",
  "12:00:00",
  "12:30:00",
  "13:00:00",
  "13:30:00",
  "14:00:00",
  "14:30:00",
  "15:00:00",
  "15:30:00",
  "16:00:00",
  "16:30:00",
] as const;

const DEMO_SLOT_TIME_SET = new Set<string>(DEMO_SLOT_TIMES as unknown as string[]);

export type DemoSlotRow = {
  id: string;
  date: string;
  time: string;
  is_booked: boolean;
};

export type DemoRequestRow = {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  date: string;
  time: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Earliest bookable calendar day: max(today, April 10) in UTC (YYYY-MM-DD). */
function minDemoBookingYmd(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const todayStr = `${y}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  const floorStr = `${y}-04-10`;
  return todayStr > floorStr ? todayStr : floorStr;
}

export function isValidYmd(s: string): boolean {
  if (!YMD.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Monday=1 … Friday=5 in UTC for that calendar date. */
export function isWeekdayYmd(ymd: string): boolean {
  const [y, m, d] = ymd.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd >= 1 && wd <= 5;
}

export function normalizeTimeHm(t: string): string | null {
  const x = String(t).trim();
  if (!HM.test(x)) return null;
  return `${x}:00`;
}

function formatTimeFromDb(t: unknown): string {
  const s = String(t);
  if (s.length >= 5) return s.slice(0, 5);
  return s;
}

export async function ensureDemoSlotsForDate(dateYmd: string): Promise<void> {
  if (!isValidYmd(dateYmd) || !isWeekdayYmd(dateYmd)) return;
  for (const t of DEMO_SLOT_TIMES) {
    await sql`
      INSERT INTO demo_slots (date, "time", is_booked)
      VALUES (${dateYmd}::date, ${t}::time, false)
      ON CONFLICT (date, "time") DO NOTHING
    `;
  }
}

export async function listAvailableSlots(dateYmd: string): Promise<DemoSlotRow[]> {
  if (!isValidYmd(dateYmd)) return [];
  if (dateYmd < minDemoBookingYmd()) return [];
  if (!isWeekdayYmd(dateYmd)) return [];
  await ensureDemoSlotsForDate(dateYmd);
  const rows = await sql`
    SELECT id, date::text AS date, "time"::text AS "time", is_booked
    FROM demo_slots
    WHERE date = ${dateYmd}::date AND is_booked = false
    ORDER BY "time"
  `;
  return (rows as DemoSlotRow[]).map((r) => ({
    ...r,
    time: formatTimeFromDb(r.time),
  }));
}

export type BookDemoInput = {
  date: string;
  time: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateBookInput(body: unknown): { ok: true; data: BookDemoInput } | { ok: false; message: string } {
  if (!body || typeof body !== "object") return { ok: false, message: "Invalid JSON body" };
  const o = body as Record<string, unknown>;
  const date = typeof o.date === "string" ? o.date.trim() : "";
  const timeRaw = typeof o.time === "string" ? o.time.trim() : "";
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const email = typeof o.email === "string" ? o.email.trim().toLowerCase() : "";
  const phone = typeof o.phone === "string" ? o.phone.trim().slice(0, 40) : null;
  const company = typeof o.company === "string" ? o.company.trim().slice(0, 200) : null;

  if (!isValidYmd(date)) return { ok: false, message: "Invalid date" };
  if (date < minDemoBookingYmd()) {
    return { ok: false, message: "Demos can be booked from 10 April onward. Choose a later date." };
  }
  if (!isWeekdayYmd(date)) return { ok: false, message: "No demos on weekends" };
  const timeNorm = normalizeTimeHm(timeRaw);
  if (!timeNorm || !DEMO_SLOT_TIME_SET.has(timeNorm)) {
    return { ok: false, message: "Invalid time slot" };
  }
  if (name.length < 1 || name.length > 200) return { ok: false, message: "Name is required" };
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Invalid email" };
  return {
    ok: true,
    data: { date, time: timeNorm, name, email, phone: phone || null, company: company || null },
  };
}

export async function bookDemoSlot(input: BookDemoInput): Promise<
  | { ok: true; request: DemoRequestRow }
  | { ok: false; code: "SLOT_TAKEN" | "DB_ERROR"; message: string }
> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureDemoSlotsForDateWithClient(client, input.date);
    const upd = await client.query<{ id: string }>(
      `UPDATE demo_slots
       SET is_booked = true
       WHERE date = $1::date AND "time" = $2::time AND is_booked = false
       RETURNING id`,
      [input.date, input.time]
    );
    if (upd.rowCount === 0) {
      await client.query("ROLLBACK");
      return { ok: false, code: "SLOT_TAKEN", message: "This time was just booked. Pick another slot." };
    }
    const slotId = upd.rows[0]!.id;
    const ins = await client.query<DemoRequestRow>(
      `INSERT INTO demo_requests (slot_id, name, email, phone, company, date, "time", status)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::date, $7::time, 'pending')
       RETURNING id, slot_id::text, name, email, phone, company, date::text, "time"::text, status,
         created_at::text, updated_at::text`,
      [
        slotId,
        input.name,
        input.email,
        input.phone,
        input.company,
        input.date,
        input.time,
      ]
    );
    await client.query("COMMIT");
    const row = ins.rows[0]!;
    return {
      ok: true,
      request: {
        ...row,
        time: formatTimeFromDb(row.time),
      },
    };
  } catch (e) {
    await client.query("ROLLBACK");
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, code: "DB_ERROR", message: msg };
  } finally {
    client.release();
  }
}

async function ensureDemoSlotsForDateWithClient(
  client: import("pg").PoolClient,
  dateYmd: string
): Promise<void> {
  if (!isValidYmd(dateYmd) || !isWeekdayYmd(dateYmd)) return;
  for (const t of DEMO_SLOT_TIMES) {
    await client.query(
      `INSERT INTO demo_slots (date, "time", is_booked)
       VALUES ($1::date, $2::time, false)
       ON CONFLICT (date, "time") DO NOTHING`,
      [dateYmd, t]
    );
  }
}

export async function listDemoRequestsForAdmin(): Promise<DemoRequestRow[]> {
  const rows = await sql`
    SELECT id, slot_id::text, name, email, phone, company, date::text, "time"::text, status,
           created_at::text, updated_at::text
    FROM demo_requests
    ORDER BY date DESC, "time" DESC, created_at DESC
  `;
  return (rows as DemoRequestRow[]).map((r) => ({
    ...r,
    time: formatTimeFromDb(r.time),
  }));
}

export async function getDemoRequestById(id: string): Promise<DemoRequestRow | null> {
  const row = firstRow<DemoRequestRow>(
    await sql`
      SELECT id, slot_id::text, name, email, phone, company, date::text, "time"::text, status,
             created_at::text, updated_at::text
      FROM demo_requests
      WHERE id = ${id}::uuid
    `
  );
  if (!row) return null;
  return { ...row, time: formatTimeFromDb(row.time) };
}

export async function updateDemoRequestStatus(
  id: string,
  status: "pending" | "confirmed" | "completed"
): Promise<DemoRequestRow | null> {
  if (status === "confirmed") {
    const transitioned = firstRow<DemoRequestRow>(
      await sql`
        UPDATE demo_requests
        SET status = 'confirmed', updated_at = NOW()
        WHERE id = ${id}::uuid AND status = 'pending'
        RETURNING id, slot_id::text, name, email, phone, company, date::text, "time"::text, status,
                  created_at::text, updated_at::text
      `
    );
    if (transitioned) {
      const formatted = { ...transitioned, time: formatTimeFromDb(transitioned.time) };
      try {
        await maybeSendDemoConfirmationInvite({
          id: formatted.id,
          name: formatted.name,
          email: formatted.email,
          phone: formatted.phone,
          company: formatted.company,
          date: formatted.date,
          time: formatted.time,
        });
      } catch (e) {
        await sql`
          UPDATE demo_requests
          SET status = 'pending', updated_at = NOW()
          WHERE id = ${id}::uuid
        `;
        throw e;
      }
      return formatted;
    }
    const existing = await getDemoRequestById(id);
    if (!existing) return null;
    if (existing.status === "confirmed") return existing;
    throw new DemoStatusTransitionError(
      existing.status === "completed"
        ? "This booking is already completed."
        : "Cannot confirm this booking."
    );
  }

  if (status === "completed") {
    const row = firstRow<DemoRequestRow>(
      await sql`
        UPDATE demo_requests
        SET status = 'completed', updated_at = NOW()
        WHERE id = ${id}::uuid AND status != 'completed'
        RETURNING id, slot_id::text, name, email, phone, company, date::text, "time"::text, status,
                  created_at::text, updated_at::text
      `
    );
    if (row) {
      return { ...row, time: formatTimeFromDb(row.time) };
    }
    const cur = await getDemoRequestById(id);
    return cur?.status === "completed" ? cur : null;
  }

  const row = firstRow<DemoRequestRow>(
    await sql`
      UPDATE demo_requests
      SET status = 'pending', updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, slot_id::text, name, email, phone, company, date::text, "time"::text, status,
                created_at::text, updated_at::text
    `
  );
  if (!row) return null;
  return { ...row, time: formatTimeFromDb(row.time) };
}
