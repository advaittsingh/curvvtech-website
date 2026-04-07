import { NextResponse } from 'next/server'

import {
  bookDemoSlotTransactional,
  validateBookDemoBody,
} from '#lib/demo-booking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const v = validateBookDemoBody(body)
    if (!v.ok) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: v.message },
        { status: 400 },
      )
    }
    const result = await bookDemoSlotTransactional(v.data)
    if (!result.ok) {
      if (result.code === 'SLOT_TAKEN') {
        return NextResponse.json(
          { error: 'SLOT_TAKEN', message: result.message },
          { status: 409 },
        )
      }
      return NextResponse.json(
        { error: 'SERVER_ERROR', message: result.message },
        { status: 500 },
      )
    }
    return NextResponse.json(
      {
        ok: true,
        booking: {
          id: result.booking.id,
          date: result.booking.date,
          time: result.booking.time,
          status: result.booking.status,
        },
      },
      { status: 201 },
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const name = e instanceof Error ? e.name : ''
    console.error('[demo/book]', e)

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
      message.includes('demo_requests') ||
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
      { error: 'SERVER_ERROR', message: 'Something went wrong. Try again.' },
      { status: 500 },
    )
  }
}
