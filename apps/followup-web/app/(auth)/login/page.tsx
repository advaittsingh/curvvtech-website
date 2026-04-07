'use client'

import {
  Box,
  Button,
  Center,
  FormControl,
  FormLabel,
  Input,
  Link,
  Stack,
  Text,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { BackgroundGradient } from '#components/gradients/background-gradient'
import { PageTransition } from '#components/motion/page-transition'
import { Section } from '#components/section'
import siteConfig from '#data/config'
import { getApiOrigin, parseApiError, setTokens, v1ApiPath } from '#lib/followup-api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const q = new URLSearchParams(window.location.search)
    if (q.get('registered') === '1') {
      setBanner('Account created. Sign in with your email and password below.')
    }
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const base = getApiOrigin()
      if (!base) {
        setError('App is not configured (NEXT_PUBLIC_API_URL).')
        return
      }
      const res = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        setError(parseApiError(data))
        return
      }
      const access = data.access_token as string | undefined
      const refreshTok = data.refresh_token as string | undefined
      if (!access) {
        setError('Invalid response from server')
        return
      }
      setTokens(access, refreshTok)
      const bus = await fetch(v1ApiPath('me/business'), {
        headers: { Authorization: `Bearer ${access}` },
      })
      let onboardingComplete = false
      if (bus.ok) {
        const row = (await bus.json()) as { questionnaire?: unknown; what_you_do?: string | null }
        const q = row.questionnaire
        onboardingComplete =
          q != null ||
          (typeof row.what_you_do === 'string' && row.what_you_do.trim().length > 0)
      }
      if (onboardingComplete) {
        router.push('/profile')
      } else {
        router.push('/onboarding')
      }
      router.refresh()
    } catch {
      setError('Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section minH="100vh" innerWidth="container.sm" py={{ base: 12, md: 20 }}>
      <BackgroundGradient zIndex="-1" />
      <PageTransition>
        <Center>
          <Box w="full" maxW="md" px={4}>
            <NextLink href="/">
              <Box as={siteConfig.logo as any} width="140px" mb={10} />
            </NextLink>
            <Text fontSize="3xl" fontWeight="bold" mb={2}>
              Log in
            </Text>
            <Text color="gray.400" fontSize="sm" mb={6}>
              Use the same credentials as the FollowUp app. After signing in, you&apos;ll finish the
              same business questionnaire as on mobile (if you haven&apos;t already).
            </Text>
            {banner ? (
              <Text color="purple.200" fontSize="sm" mb={4}>
                {banner}
              </Text>
            ) : null}
            <Box as="form" onSubmit={onSubmit}>
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </FormControl>
                {error ? (
                  <Text color="red.400" fontSize="sm">
                    {error}
                  </Text>
                ) : null}
                <Button type="submit" colorScheme="purple" isLoading={busy}>
                  Sign in
                </Button>
              </Stack>
            </Box>
            <Text color="gray.500" fontSize="sm" textAlign="center" mt={6}>
              New here?{' '}
              <Link as={NextLink as any} href="/signup" color="purple.300">
                Create an account
              </Link>
            </Text>
          </Box>
        </Center>
      </PageTransition>
    </Section>
  )
}
