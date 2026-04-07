import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { COOKIE_ACCESS, COOKIE_REFRESH, setAccessCookieOnly } from '#lib/auth-cookies'
import { cognitoRefresh } from '#lib/cognito-actions'
import { ensureUser } from '#lib/ensure-user'
import { verifyCognitoJwt } from '#lib/jwt-cognito'
import { getSql } from '#lib/neon'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function sessionPayload(access: string) {
  const { sub, email: tokenEmail } = await verifyCognitoJwt(access)
  const sql = getSql()
  const rows = (await sql`
    SELECT u.id, u.email, u.access_allowed, u.waitlist_position,
           bp.questionnaire, bp.what_you_do
    FROM users u
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    WHERE u.auth_sub = ${sub}
    LIMIT 1
  `) as {
    id: string
    email: string | null
    access_allowed: boolean
    waitlist_position: number | null
    questionnaire: unknown
    what_you_do: string | null
  }[]
  let row = rows[0]

  if (!row) {
    const u = await ensureUser(sql, { sub, email: tokenEmail })
    return {
      authenticated: true as const,
      email: u.email || tokenEmail,
      accessAllowed: u.accessAllowed,
      waitlistPosition: u.waitlistPosition,
      onboardingComplete: false,
    }
  }

  const q = row.questionnaire
  const hasQ =
    q != null ||
    (typeof row.what_you_do === 'string' && row.what_you_do.trim().length > 0)

  return {
    authenticated: true as const,
    email: row.email || tokenEmail,
    accessAllowed: row.access_allowed,
    waitlistPosition: row.waitlist_position,
    onboardingComplete: hasQ,
  }
}

export async function GET() {
  const jar = cookies()
  let access = jar.get(COOKIE_ACCESS)?.value || ''
  const refresh = jar.get(COOKIE_REFRESH)?.value || ''

  if (!access && refresh) {
    try {
      const t = await cognitoRefresh(refresh)
      access = t.accessToken
      const data = await sessionPayload(access)
      const res = NextResponse.json(data)
      setAccessCookieOnly(res, t.accessToken, t.expiresIn)
      return res
    } catch {
      return NextResponse.json({ authenticated: false })
    }
  }

  if (!access) {
    return NextResponse.json({ authenticated: false })
  }

  try {
    const data = await sessionPayload(access)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
