import type { NextResponse } from 'next/server'

export const COOKIE_ACCESS = 'fu_access_token'
export const COOKIE_REFRESH = 'fu_refresh_token'

export function setAuthCookies(
  res: NextResponse,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number }
) {
  const secure = process.env.NODE_ENV === 'production'
  res.cookies.set(COOKIE_ACCESS, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.max(60, tokens.expiresIn),
  })
  res.cookies.set(COOKIE_REFRESH, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearAuthCookies(res: NextResponse) {
  const secure = process.env.NODE_ENV === 'production'
  const opts = { path: '/', secure, sameSite: 'lax' as const, maxAge: 0 }
  res.cookies.set(COOKIE_ACCESS, '', opts)
  res.cookies.set(COOKIE_REFRESH, '', opts)
}

export function setAccessCookieOnly(
  res: NextResponse,
  accessToken: string,
  expiresIn: number
) {
  const secure = process.env.NODE_ENV === 'production'
  res.cookies.set(COOKIE_ACCESS, accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.max(60, expiresIn),
  })
}
