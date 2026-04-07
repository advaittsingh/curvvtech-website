'use client'

import { Center, Spinner, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { BusinessQuestionnaireForm } from '#components/business-questionnaire-form'
import { useAuthSession } from '#hooks/use-auth-session'

export default function OnboardingPage() {
  const router = useRouter()
  const session = useAuthSession()

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
    if (session.onboardingComplete) {
      router.replace('/profile')
    }
  }, [session, router])

  if (session.loading) {
    return (
      <Center minH="60vh">
        <Spinner size="lg" color="purple.400" />
      </Center>
    )
  }

  if (!session.authenticated || !session.accessAllowed) {
    return null
  }

  if (session.onboardingComplete) {
    return null
  }

  return (
    <Center minH="calc(100vh - 120px)" px="6" py="16">
      <Stack spacing={6} w="full" maxW="lg" align="stretch">
        <Text fontSize="sm" color="gray.400">
          Signed in as {session.email || 'your account'}
        </Text>
        <BusinessQuestionnaireForm />
      </Stack>
    </Center>
  )
}
