'use client'

import { useCallback, useEffect, useState } from 'react'

import { clearTokens, getAccessToken, getApiOrigin, v1ApiPath } from '#lib/followup-api'

export type AuthSessionState = {
  loading: boolean
  authenticated: boolean
  email: string | null
  accessAllowed: boolean
  waitlistPosition: number | null
  onboardingComplete: boolean
}

const initial: AuthSessionState = {
  loading: true,
  authenticated: false,
  email: null,
  accessAllowed: true,
  waitlistPosition: null,
  onboardingComplete: false,
}

async function fetchBusinessComplete(token: string): Promise<boolean> {
  const res = await fetch(v1ApiPath('me/business'), { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return false
  const row = (await res.json()) as {
    questionnaire?: unknown
    what_you_do?: string | null
  }
  const q = row.questionnaire
  const hasQ =
    q != null || (typeof row.what_you_do === 'string' && row.what_you_do.trim().length > 0)
  return hasQ
}

export function useAuthSession() {
  const [state, setState] = useState<AuthSessionState>(initial)

  const refresh = useCallback(() => {
    setState((s) => ({ ...s, loading: true }))
    const base = getApiOrigin()
    const token = getAccessToken()
    if (!base || !token) {
      setState({
        loading: false,
        authenticated: false,
        email: null,
        accessAllowed: true,
        waitlistPosition: null,
        onboardingComplete: false,
      })
      return Promise.resolve()
    }

    return fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (r.status === 401) {
          clearTokens()
          setState({
            loading: false,
            authenticated: false,
            email: null,
            accessAllowed: true,
            waitlistPosition: null,
            onboardingComplete: false,
          })
          return
        }
        if (!r.ok) throw new Error('me_failed')
        const me = (await r.json()) as {
          email?: string | null
          access_allowed?: boolean
          waitlist_position?: number | null
        }
        const onboardingComplete = await fetchBusinessComplete(token)
        setState({
          loading: false,
          authenticated: true,
          email: me.email ?? null,
          accessAllowed: me.access_allowed !== false,
          waitlistPosition:
            typeof me.waitlist_position === 'number'
              ? me.waitlist_position
              : me.waitlist_position != null
                ? Number(me.waitlist_position)
                : null,
          onboardingComplete,
        })
      })
      .catch(() => {
        setState({
          loading: false,
          authenticated: false,
          email: null,
          accessAllowed: true,
          waitlistPosition: null,
          onboardingComplete: false,
        })
      })
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { ...state, refresh }
}
