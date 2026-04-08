'use client'

import {
  Box,
  Button,
  Center,
  FormControl,
  FormLabel,
  Heading,
  Input,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  Textarea,
  useToast,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'

import { useAuthSession } from '#hooks/use-auth-session'
import { fetchWithAuth } from '#lib/fetch-with-auth'
import { getApiOrigin, parseApiError, v1ApiPath } from '#lib/followup-api'

type ServerProfile = {
  display_name: string
  phone: string
  email: string
  business_address: string
  business_website: string
  profile_photo_s3_key: string | null
  id_document_s3_key: string | null
  id_verification_status: string
}

function initials(name: string, email: string | null): string {
  const s = name.trim() || email?.trim() || '?'
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  }
  return s.slice(0, 2).toUpperCase()
}

export default function ProfileUserPage() {
  const toast = useToast()
  const session = useAuthSession()
  const [profile, setProfile] = useState<ServerProfile | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const base = getApiOrigin()
    if (!base) {
      setLoadError('App is not configured (NEXT_PUBLIC_API_URL).')
      setLoading(false)
      return
    }
    setLoadError(null)
    try {
      const res = await fetchWithAuth(v1ApiPath('me/profile'), {
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
        setLoadError(
          res.status === 401
            ? 'Session expired. Sign in again.'
            : parseApiError(data) || 'Could not load your profile.',
        )
        return
      }
      setProfile((await res.json()) as ServerProfile)
    } catch {
      setLoadError('Could not load your profile.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    if (!profile) return
    const base = getApiOrigin()
    if (!base) return
    setSaving(true)
    try {
      const res = await fetchWithAuth(v1ApiPath('me/profile'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: profile.display_name,
          phone: profile.phone,
          email: profile.email,
          business_address: profile.business_address,
          business_website: profile.business_website,
        }),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        toast({ title: parseApiError(data), status: 'error' })
        return
      }
      setProfile(data as ServerProfile)
      void session.refresh()
      toast({ title: 'Details saved', status: 'success' })
    } catch {
      toast({ title: 'Network error', status: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Center minH="40vh">
        <Spinner size="lg" color="purple.400" />
      </Center>
    )
  }

  if (!profile) {
    return (
      <Stack spacing={4}>
        <Text color="red.400">{loadError || 'Could not load profile.'}</Text>
        <Button onClick={() => void load()}>Retry</Button>
      </Stack>
    )
  }

  const displayName = profile.display_name?.trim() || ''

  return (
    <Stack spacing={8}>
      <Stack spacing={2}>
        <Heading as="h1" size="lg">
          User details
        </Heading>
        <Text color="muted" fontSize="sm">
          Same fields as the FollowUp app — Edit profile → User details.
        </Text>
      </Stack>

      <Stack direction={{ base: 'column', md: 'row' }} spacing={6} align={{ md: 'center' }}>
        <Center
          w="88px"
          h="88px"
          borderRadius="full"
          bg="purple.500"
          color="white"
          fontSize="2xl"
          fontWeight="bold"
          flexShrink={0}
        >
          {initials(displayName, session.email)}
        </Center>
        <Stack spacing={1}>
          <Text fontWeight="semibold" fontSize="lg">
            {displayName || 'Your profile'}
          </Text>
          {session.email ? (
            <Text color="muted" fontSize="sm">
              {session.email}
            </Text>
          ) : null}
        </Stack>
      </Stack>

      <Box
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        borderRadius="xl"
        p={{ base: 5, md: 6 }}
        bg="whiteAlpha.50"
      >
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl>
            <FormLabel>Name</FormLabel>
            <Input
              value={profile.display_name}
              onChange={(e) => setProfile((p) => (p ? { ...p, display_name: e.target.value } : p))}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Phone</FormLabel>
            <Input
              value={profile.phone}
              onChange={(e) => setProfile((p) => (p ? { ...p, phone: e.target.value } : p))}
            />
          </FormControl>
          <FormControl gridColumn={{ md: '1 / -1' }}>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile((p) => (p ? { ...p, email: e.target.value } : p))}
            />
          </FormControl>
          <FormControl gridColumn={{ md: '1 / -1' }}>
            <FormLabel>Business address</FormLabel>
            <Textarea
              value={profile.business_address}
              onChange={(e) => setProfile((p) => (p ? { ...p, business_address: e.target.value } : p))}
              rows={3}
            />
          </FormControl>
          <FormControl gridColumn={{ md: '1 / -1' }}>
            <FormLabel>Business website</FormLabel>
            <Input
              type="url"
              value={profile.business_website}
              onChange={(e) => setProfile((p) => (p ? { ...p, business_website: e.target.value } : p))}
            />
          </FormControl>
        </SimpleGrid>
        <Button mt={6} colorScheme="purple" isLoading={saving} onClick={() => void save()}>
          Save user details
        </Button>
      </Box>
    </Stack>
  )
}
