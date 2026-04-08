'use client'

import {
  Box,
  Button,
  HStack,
  Heading,
  Icon,
  LinkBox,
  LinkOverlay,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import { HiLocationMarker, HiOutlineOfficeBuilding, HiOutlineUserGroup } from 'react-icons/hi'
import NextLink from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { PROFILE_SECTION_ITEMS } from '#components/profile/profile-nav-items'
import { fetchWithAuth } from '#lib/fetch-with-auth'
import { v1ApiPath } from '#lib/followup-api'

type BusinessRow = {
  what_you_do?: string
  description?: string
  questionnaire?: {
    businessName?: string
    businessType?: string
    whereCustomersLive?: string
  } | null
}

type ProfileRow = {
  display_name?: string
  business_address?: string
}

export function ProfileHub() {
  const toast = useToast()
  const [business, setBusiness] = useState<BusinessRow | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)

  const load = useCallback(async () => {
    const [bRes, pRes] = await Promise.all([
      fetchWithAuth(v1ApiPath('me/business')),
      fetchWithAuth(v1ApiPath('me/profile')),
    ])
    if (bRes.ok) {
      setBusiness((await bRes.json()) as BusinessRow)
    }
    if (pRes.ok) {
      setProfile((await pRes.json()) as ProfileRow)
    }
    if (!bRes.ok && !pRes.ok) {
      toast({
        title: 'Could not load business overview',
        status: 'warning',
      })
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const model = useMemo(() => {
    const q = business?.questionnaire ?? null
    const businessName =
      q?.businessName?.trim() || profile?.display_name?.trim() || 'Your business'
    const category = q?.businessType?.trim() || business?.what_you_do?.trim() || 'Business'
    const description =
      business?.description?.trim() ||
      'Keep your profile updated so FollowUp can generate better follow-ups for your customers.'
    const location =
      q?.whereCustomersLive?.trim() ||
      profile?.business_address?.trim() ||
      'Location not added yet'

    return { businessName, category, description, location }
  }, [business, profile])

  return (
    <Stack spacing={8}>
      <Stack spacing={2}>
        <Heading as="h1" size="lg">
          Profile overview
        </Heading>
        <Text color="muted" fontSize="sm">
          Manage profile, billing, and usage from one place.
        </Text>
      </Stack>

      <Box
        borderRadius="2xl"
        p={{ base: 5, md: 7 }}
        color="white"
        bgGradient="linear(to-r, purple.900, purple.700, pink.600)"
        borderWidth="1px"
        borderColor="whiteAlpha.300"
      >
        <Stack spacing={5}>
          <HStack justify="space-between" align="flex-start" spacing={4}>
            <Stack spacing={1}>
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="wider" color="whiteAlpha.800">
                Business Summary
              </Text>
              <Heading size="md">{model.businessName}</Heading>
              <Text color="whiteAlpha.900">{model.category}</Text>
            </Stack>
          </HStack>

          <Text color="whiteAlpha.900">{model.description}</Text>

          <HStack spacing={6} flexWrap="wrap">
            <HStack spacing={2}>
              <Icon as={HiLocationMarker} boxSize={4} color="whiteAlpha.900" />
              <Text fontSize="sm" color="whiteAlpha.900">
                {model.location}
              </Text>
            </HStack>
            <HStack spacing={2}>
              <Icon as={HiOutlineOfficeBuilding} boxSize={4} color="whiteAlpha.900" />
              <Text fontSize="sm" color="whiteAlpha.900">
                FollowUp profile
              </Text>
            </HStack>
          </HStack>

          <HStack spacing={3} flexWrap="wrap">
            {PROFILE_SECTION_ITEMS.map((it) => (
              <LinkBox key={it.href}>
                <Button as={NextLink as any} href={it.href} size="sm" colorScheme="blackAlpha" variant="solid">
                  <LinkOverlay as="span">{it.label}</LinkOverlay>
                </Button>
              </LinkBox>
            ))}
            <Button
              as={NextLink as any}
              href="/leads"
              size="sm"
              leftIcon={<HiOutlineUserGroup />}
              colorScheme="blackAlpha"
              variant="outline"
            >
              Leads
            </Button>
          </HStack>
        </Stack>
      </Box>
    </Stack>
  )
}
