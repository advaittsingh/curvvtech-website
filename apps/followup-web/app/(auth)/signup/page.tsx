'use client'

import {
  Box,
  Button,
  Center,
  Collapse,
  FormControl,
  FormLabel,
  Input,
  Link,
  Stack,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { BackgroundGradient } from '#components/gradients/background-gradient'
import { PageTransition } from '#components/motion/page-transition'
import { Section } from '#components/section'
import siteConfig from '#data/config'
import { getApiOrigin, landingHeaders, parseApiError } from '#lib/followup-api'

export default function SignupPage() {
  const router = useRouter()
  const waitlistOnly = useDisclosure()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [waitEmail, setWaitEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const em = email.trim().toLowerCase()
    if (!em.includes('@')) {
      setError('Enter a valid email.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters (same as the FollowUp app).')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const base = getApiOrigin()
      if (!base) {
        setError('App is not configured (NEXT_PUBLIC_API_URL).')
        return
      }
      const res = await fetch(`${base}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, password }),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        setError(parseApiError(data))
        return
      }
      router.push('/login?registered=1')
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const onWaitlistOnly = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const contact = waitEmail.trim()
    if (!contact) {
      setError('Enter your email or phone.')
      return
    }
    setBusy(true)
    try {
      const base = getApiOrigin()
      if (!base) {
        setError('App is not configured (NEXT_PUBLIC_API_URL).')
        return
      }
      const res = await fetch(`${base}/api/v1/public/waitlist`, {
        method: 'POST',
        headers: landingHeaders(),
        body: JSON.stringify({ contact }),
      })
      if (!res.ok) {
        setError('Could not save your request. Check your connection or database setup.')
        return
      }
      router.push('/welcome')
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
              Create your FollowUp account
            </Text>
            <Text color="gray.400" fontSize="sm" mb={8}>
              Same email and password you&apos;ll use in the mobile app. After sign up, sign in and
              complete the business questionnaire—it matches the app onboarding.
            </Text>

            <Box as="form" onSubmit={onCreateAccount}>
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
                    autoComplete="new-password"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Confirm password</FormLabel>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </FormControl>
                {error && !waitlistOnly.isOpen ? (
                  <Text color="red.400" fontSize="sm">
                    {error}
                  </Text>
                ) : null}
                <Button type="submit" colorScheme="purple" isLoading={busy} loadingText="Creating…">
                  Sign up
                </Button>
              </Stack>
            </Box>

            <Text color="gray.500" fontSize="sm" textAlign="center" mt={6}>
              Already have an account?{' '}
              <Link as={NextLink as any} href="/login" color="purple.300">
                Log in
              </Link>
            </Text>

            <Button variant="link" size="sm" color="gray.500" mt={6} onClick={waitlistOnly.onToggle}>
              {waitlistOnly.isOpen ? 'Hide' : 'Get updates only'} (no password yet)
            </Button>

            <Collapse in={waitlistOnly.isOpen} animateOpacity>
              <Box
                as="form"
                onSubmit={onWaitlistOnly}
                mt={4}
                pt={4}
                borderTopWidth="1px"
                borderColor="whiteAlpha.200"
              >
                <FormControl>
                  <FormLabel>Email or phone</FormLabel>
                  <Input
                    value={waitEmail}
                    onChange={(e) => setWaitEmail(e.target.value)}
                    placeholder="you@business.com"
                  />
                </FormControl>
                {error && waitlistOnly.isOpen ? (
                  <Text color="red.400" fontSize="sm" mt={2}>
                    {error}
                  </Text>
                ) : null}
                <Button type="submit" variant="outline" mt={4} w="full" isLoading={busy}>
                  Get updates
                </Button>
              </Box>
            </Collapse>

            <Text color="gray.600" fontSize="xs" mt={10}>
              By continuing you agree to our{' '}
              <Link as={NextLink as any} href={siteConfig.termsUrl} color="gray.400">
                Terms
              </Link>{' '}
              and{' '}
              <Link as={NextLink as any} href={siteConfig.privacyUrl} color="gray.400">
                Privacy Policy
              </Link>
              .
            </Text>
          </Box>
        </Center>
      </PageTransition>
    </Section>
  )
}
