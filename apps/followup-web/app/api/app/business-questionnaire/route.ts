import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { COOKIE_ACCESS } from '#lib/auth-cookies'
import { verifyCognitoJwt } from '#lib/jwt-cognito'
import {
  type BusinessQuestionnaire,
  pageValid,
  questionnaireToProfile,
} from '#lib/questionnaire-shared'
import { getSql } from '#lib/neon'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isQuestionnaire(x: unknown): x is BusinessQuestionnaire {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return Array.isArray(o.customerSources) && typeof o.primaryOffer === 'string'
}

export async function POST(request: Request) {
  const access = cookies().get(COOKIE_ACCESS)?.value || ''
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let sub: string
  try {
    const v = await verifyCognitoJwt(access)
    sub = v.sub
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { questionnaire?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!isQuestionnaire(body.questionnaire)) {
    return NextResponse.json({ error: 'Invalid questionnaire payload' }, { status: 400 })
  }

  const q = body.questionnaire
  if (!pageValid(3, q)) {
    return NextResponse.json({ error: 'Please complete all steps' }, { status: 400 })
  }

  const profile = questionnaireToProfile(q)

  try {
    const sql = getSql()
    const users = (await sql`SELECT id FROM users WHERE auth_sub = ${sub} LIMIT 1`) as {
      id: string
    }[]
    const uid = users[0]?.id
    if (!uid) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 })
    }

    const qJson = JSON.stringify(q)

    await sql`
      INSERT INTO business_profiles (user_id, what_you_do, customer_asks, customer_source, description, questionnaire)
      VALUES (
        ${uid},
        ${profile.whatYouDo},
        ${profile.customerAsks},
        ${profile.customerSource},
        ${profile.description},
        ${qJson}::jsonb
      )
      ON CONFLICT (user_id) DO UPDATE SET
        what_you_do = EXCLUDED.what_you_do,
        customer_asks = EXCLUDED.customer_asks,
        customer_source = EXCLUDED.customer_source,
        description = EXCLUDED.description,
        questionnaire = EXCLUDED.questionnaire,
        updated_at = now()
    `
  } catch (e) {
    console.error('[business-questionnaire]', e)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
