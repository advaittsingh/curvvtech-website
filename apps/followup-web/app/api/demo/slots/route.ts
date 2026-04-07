import { NextResponse } from 'next/server'

import { listAvailableDemoSlots } from '#lib/demo-booking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = (searchParams.get('date') || '').trim()
    if (!date) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Missing date query (YYYY-MM-DD)',
        },
        { status: 400 },
      )
    }
    const slots = await listAvailableDemoSlots(date)
    return NextResponse.json({ date, slots })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const name = e instanceof Error ? e.name : ''
    console.error('[demo/slots]', e)

    if (name === 'MissingDatabaseEnv' || message === 'MISSING_DATABASE_ENV') {
      return NextResponse.json(
        {
          error: 'Database is not configured.',
          code: 'MISSING_DATABASE_URL',
        },
        { status: 503 },
      )
    }

    if (
      message.includes('demo_slots') ||
      message.includes('does not exist') ||
      message.includes('relation')
    ) {
      return NextResponse.json(
        {
          error:
            'Demo tables missing. Run migration 007_demo_booking.sql on this database.',
          code: 'MISSING_TABLE',
        },
        { status: 503 },
      )
    }

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Could not load times. Try again.' },
      { status: 500 },
    )
  }
}
