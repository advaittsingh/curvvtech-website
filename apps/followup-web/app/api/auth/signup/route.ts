import { NextResponse } from 'next/server'

import { cognitoSignUp } from '#lib/cognito-actions'
import { assertCognitoConfigured } from '#lib/cognito-config'
import { getSql } from '#lib/neon'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    assertCognitoConfigured()
  } catch {
    return NextResponse.json(
      {
        error:
          'Sign-up is not configured. Set COGNITO_REGION, COGNITO_USER_POOL_ID, and COGNITO_CLIENT_ID.',
      },
      { status: 503 },
    )
  }

  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  try {
    await cognitoSignUp(email, password)
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'UsernameExistsException') {
      return NextResponse.json(
        { error: 'An account with this email already exists. Sign in instead.' },
        { status: 409 },
      )
    }
    const msg = e instanceof Error ? e.message : 'Sign up failed'
    console.error('[auth/signup]', e)
    return NextResponse.json({ error: msg, code: name }, { status: 400 })
  }

  try {
    const sql = getSql()
    await sql`
      INSERT INTO waitlist_entries (contact) VALUES (${email})
      ON CONFLICT (contact) DO NOTHING
    `
  } catch (e) {
    console.error('[auth/signup] waitlist', e)
  }

  return NextResponse.json({ ok: true })
}
