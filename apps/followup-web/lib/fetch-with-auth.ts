import {
  clearTokens,
  getAccessToken,
  getApiOrigin,
  getRefreshToken,
  setTokens,
} from '#lib/followup-api'

/**
 * Refresh access token via unified API. Returns new access token or null.
 * On failure does not clear storage (caller decides after a failed API call).
 */
export async function tryRefreshAccessToken(): Promise<string | null> {
  const origin = getApiOrigin()
  const rt = getRefreshToken()
  if (!origin || !rt) return null

  const res = await fetch(`${origin}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
  })
  if (!res.ok) return null

  const data = (await res.json()) as Record<string, unknown>
  const access = data.access_token
  const nextRt = data.refresh_token
  if (typeof access !== 'string' || !access) return null
  setTokens(access, typeof nextRt === 'string' ? nextRt : undefined)
  return access
}

function json401(message: string): Response {
  return new Response(JSON.stringify({ error: 'MISSING_BEARER', message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Fetch with Bearer access token; on 401 attempts one refresh + retry.
 * Clears tokens only if refresh fails or retry still returns 401.
 */
export async function fetchWithAuth(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getAccessToken()
  if (!token) {
    return json401('Sign in required')
  }

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)

  let res = await fetch(url, { ...init, headers })

  if (res.status !== 401) return res

  const refreshed = await tryRefreshAccessToken()
  if (!refreshed) {
    clearTokens()
    return res
  }

  headers.set('Authorization', `Bearer ${refreshed}`)
  res = await fetch(url, { ...init, headers })
  if (res.status === 401) clearTokens()
  return res
}
