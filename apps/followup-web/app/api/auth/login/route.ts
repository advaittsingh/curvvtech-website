import { NextResponse } from 'next/server'

import { setAuthCookies } from '#lib/auth-cookies'
import { cognitoSignIn } from '#lib/cognito-actions'
import { assertCognitoConfigured } from '#lib/cognito-config'
import { ensureUser } from '#lib/ensure-user'
import { verifyCognitoJwt } from '#lib/jwt-cognito'
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
          'Login is not configured. Set COGNITO_REGION, COGNITO_USER_POOL_ID, and COGNITO_CLIENT_ID.',
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

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  let tokens: Awaited<ReturnType<typeof cognitoSignIn>>
  try {
    tokens = await cognitoSignIn(email, password)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Login failed'
    console.error('[auth/login]', e)
    return NextResponse.json(
      { error: msg.includes('NotAuthorized') ? 'Incorrect email or password.' : msg },
      { status: 401 },
    )
  }

  if (!tokens.idToken) {
    return NextResponse.json({ error: 'Missing ID token from Cognito' }, { status: 500 })
  }

  try {
    const { sub, email: idEmail } = await verifyCognitoJwt(tokens.idToken)
    const sql = getSql()
    await ensureUser(sql, { sub, email: idEmail || email })
  } catch (e) {
    console.error('[auth/login] ensureUser', e)
    return NextResponse.json({ error: 'Could not sync your account' }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true })
  setAuthCookies(res, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
  })
  return res
}
