'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { setStoredTokens } from '@/lib/auth-api'

export default function AuthConfirmClient() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const access = searchParams.get('access_token')
    const refresh = searchParams.get('refresh_token')
    const next = searchParams.get('next') ?? '/'
    if (access) {
      setStoredTokens(access, refresh ?? undefined)
    }
    window.location.href = next
  }, [searchParams])

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-dark_black/60 dark:text-white/60">Redirecting...</p>
    </div>
  )
}
