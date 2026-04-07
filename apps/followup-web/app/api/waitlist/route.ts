import { NextResponse } from 'next/server'

import { getSql } from '#lib/neon'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const contact = typeof body.contact === 'string' ? body.contact.trim() : ''

    if (!contact) {
      return NextResponse.json({ error: 'contact is required' }, { status: 400 })
    }

    const sql = getSql()
    const pre = (await sql`
      SELECT 1 AS ok FROM waitlist_entries WHERE contact = ${contact} LIMIT 1
    `) as unknown[]
    const existedBefore = Array.isArray(pre) && pre.length > 0

    await sql`
      INSERT INTO waitlist_entries (contact) VALUES (${contact})
      ON CONFLICT (contact) DO NOTHING
    `

    return NextResponse.json({
      ok: true,
      existed: existedBefore,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const name = e instanceof Error ? e.name : ''
    console.error('[waitlist]', e)

    if (name === 'MissingDatabaseEnv' || message === 'MISSING_DATABASE_ENV') {
      return NextResponse.json(
        {
          error: 'Database is not configured.',
          code: 'MISSING_DATABASE_URL',
          hint: 'Add DATABASE_URL (Neon) to .env.local and run backend migrations on this database.',
        },
        { status: 503 },
      )
    }

    if (message.includes('waitlist_entries') || message.includes('does not exist')) {
      return NextResponse.json(
        {
          error: 'Database schema missing. Run migrations from the FollowUp backend against this Neon database.',
          code: 'MISSING_TABLE',
        },
        { status: 503 },
      )
    }

    const dev = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'server error',
        code: 'UNKNOWN',
        ...(dev && { details: message }),
      },
      { status: 500 },
    )
  }
}
