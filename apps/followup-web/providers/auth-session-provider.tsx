'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { fetchWithAuth } from '#lib/fetch-with-auth'
import { getAccessToken, getApiOrigin, v1ApiPath } from '#lib/followup-api'

export type AuthSessionState = {
  loading: boolean
  authenticated: boolean
  email: string | null
  accessAllowed: boolean
  waitlistPosition: number | null
  onboardingComplete: boolean
  /** Transient /me failure — tokens usually kept */
  sessionError: 'network' | 'server' | null
}

type Ctx = AuthSessionState & { refresh: () => Promise<void> }

const initial: AuthSessionState = {
  loading: true,
  authenticated: false,
  email: null,
  accessAllowed: true,
  waitlistPosition: null,
  onboardingComplete: false,
  sessionError: null,
}

const AuthSessionContext = createContext<Ctx | null>(null)

const ONBOARDING_CACHE_TTL_MS = 60_000

async function fetchBusinessOnboardingComplete(): Promise<boolean> {
  const res = await fetchWithAuth(v1ApiPath('me/business'))
  if (!res.ok) return false
  const row = (await res.json()) as {
    questionnaire?: unknown
    what_you_do?: string | null
  }
  const q = row.questionnaire
  return (
    q != null || (typeof row.what_you_do === 'string' && row.what_you_do.trim().length > 0)
  )
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthSessionState>(initial)
  const wasAuthedRef = useRef(false)
  const onboardingCacheRef = useRef<{ token: string; value: boolean; at: number } | null>(null)

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, sessionError: null }))
    const base = getApiOrigin()
    const token = getAccessToken()
    if (!base || !token) {
      onboardingCacheRef.current = null
      wasAuthedRef.current = false
      setState({
        loading: false,
        authenticated: false,
        email: null,
        accessAllowed: true,
        waitlistPosition: null,
        onboardingComplete: false,
        sessionError: null,
      })
      return
    }

    try {
      const r = await fetchWithAuth(`${base}/api/auth/me`, {
        headers: { 'Content-Type': 'application/json' },
      })

      if (r.status === 401) {
        onboardingCacheRef.current = null
        wasAuthedRef.current = false
        setState({
          loading: false,
          authenticated: false,
          email: null,
          accessAllowed: true,
          waitlistPosition: null,
          onboardingComplete: false,
          sessionError: null,
        })
        return
      }

      if (!r.ok) {
        const kind: 'server' = 'server'
        if (wasAuthedRef.current) {
          setState((s) => ({
            ...s,
            loading: false,
            sessionError: kind,
          }))
          return
        }
        setState({
          loading: false,
          authenticated: false,
          email: null,
          accessAllowed: true,
          waitlistPosition: null,
          onboardingComplete: false,
          sessionError: kind,
        })
        return
      }

      const me = (await r.json()) as {
        email?: string | null
        access_allowed?: boolean
        waitlist_position?: number | null
      }
      const tokenNow = getAccessToken()!
      const cache = onboardingCacheRef.current
      let onboardingComplete: boolean
      if (
        cache &&
        cache.token === tokenNow &&
        Date.now() - cache.at < ONBOARDING_CACHE_TTL_MS
      ) {
        onboardingComplete = cache.value
      } else {
        onboardingComplete = await fetchBusinessOnboardingComplete()
        onboardingCacheRef.current = {
          token: tokenNow,
          value: onboardingComplete,
          at: Date.now(),
        }
      }
      wasAuthedRef.current = true
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
        sessionError: null,
      })
    } catch {
      if (wasAuthedRef.current) {
        setState((s) => ({
          ...s,
          loading: false,
          sessionError: 'network',
        }))
      } else {
        setState({
          loading: false,
          authenticated: false,
          email: null,
          accessAllowed: true,
          waitlistPosition: null,
          onboardingComplete: false,
          sessionError: 'network',
        })
      }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<Ctx>(() => ({ ...state, refresh }), [state, refresh])

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}

export function useAuthSession(): Ctx {
  const ctx = useContext(AuthSessionContext)
  if (!ctx) {
    throw new Error('useAuthSession must be used within AuthSessionProvider')
  }
  return ctx
}
