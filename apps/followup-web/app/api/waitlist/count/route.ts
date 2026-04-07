import { NextResponse } from 'next/server'

import { getSql } from '#lib/neon'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sql = getSql()
    const rows = (await sql`
      SELECT COUNT(*)::int AS c FROM waitlist_entries
    `) as { c: number }[]
    const c = Number(rows[0]?.c ?? 0)
    return NextResponse.json({ total: c })
  } catch (e) {
    console.error('[waitlist-count]', e)
    return NextResponse.json({ total: 0 }, { status: 200 })
  }
}
