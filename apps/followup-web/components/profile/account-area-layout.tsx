'use client'

import { Center, Spinner } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { ProfileShell } from '#components/profile/profile-shell'
import { useAuthSession } from '#hooks/use-auth-session'

export function AccountAreaLayout({ children }: { children: React.ReactNode }) {
  const session = useAuthSession()
  const router = useRouter()

  useEffect(() => {
    if (session.loading) return
    if (!session.authenticated) {
      router.replace('/login')
      return
    }
    if (!session.accessAllowed) {
      router.replace('/welcome')
      return
    }
    if (!session.onboardingComplete) {
      router.replace('/onboarding')
    }
  }, [session, router])

  if (session.loading) {
    return (
      <Center minH="50vh">
        <Spinner size="lg" color="purple.400" />
      </Center>
    )
  }

  if (!session.authenticated || !session.accessAllowed || !session.onboardingComplete) {
    return null
  }

  return <ProfileShell>{children}</ProfileShell>
}
