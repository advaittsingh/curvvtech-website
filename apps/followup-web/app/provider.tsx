'use client'

import { SaasProvider } from '@saas-ui/react'

import { AuthSessionProvider } from '#hooks/use-auth-session'
import { theme } from '#theme'

export function Provider(props: { children: React.ReactNode }) {
  // Monorepo duplicate @types/react; SaasProvider expects the other ReactNode variant.
  return (
    <SaasProvider theme={theme}>
      <AuthSessionProvider>{props.children as any}</AuthSessionProvider>
    </SaasProvider>
  )
}
