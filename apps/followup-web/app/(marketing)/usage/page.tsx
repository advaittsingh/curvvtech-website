'use client'

import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Heading,
  Progress,
  Stack,
  Text,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { fetchUsage, type UsageResponse } from '#lib/followup-billing'

type Limits = {
  leads_per_month: number | null
  ai_assistant_messages_per_month: number | null
  follow_up_automations_per_month: number | null
}

function pct(used: number, cap: number | null): number {
  if (cap == null || cap <= 0) return 0
  return Math.min(100, Math.round((used / cap) * 100))
}

export default function UsagePage() {
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error' | 'unconfigured'>('loading')
  const [loadError, setLoadError] = useState('')
  const [data, setData] = useState<UsageResponse | null>(null)

  const load = useCallback(async () => {
    setLoadState('loading')
    setLoadError('')
    const r = await fetchUsage()
    if (!r.ok && r.status === 0) {
      setLoadState('unconfigured')
      setLoadError(r.message)
      return
    }
    if (!r.ok) {
      setLoadState('error')
      setLoadError(
        r.status === 401 ? 'Your session expired. Sign in again to view usage.' : r.message,
      )
      return
    }
    setData(r.data)
    setLoadState('ready')
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loadState === 'loading') {
    return <Text color="muted">Loading usage…</Text>
  }

  if (loadState === 'error' || loadState === 'unconfigured') {
    return (
      <Stack spacing={3}>
        <Alert status="error" borderRadius="md" variant="subtle">
          <AlertIcon />
          <Box>
            <AlertTitle fontSize="sm">
              {loadState === 'unconfigured' ? 'Not configured' : 'Could not load usage'}
            </AlertTitle>
            <AlertDescription fontSize="sm">{loadError}</AlertDescription>
          </Box>
        </Alert>
        {loadState === 'error' ? (
          <Button as={NextLink as any} href="/login" size="sm" colorScheme="purple" w="fit-content">
            Sign in
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={() => void load()}>
          Retry
        </Button>
      </Stack>
    )
  }

  if (loadState === 'ready' && !data) {
    return (
      <Stack spacing={3}>
        <Alert status="warning" borderRadius="md" variant="subtle">
          <AlertIcon />
          <Box>
            <AlertTitle fontSize="sm">Unexpected empty response</AlertTitle>
            <AlertDescription fontSize="sm">Try again or sign in.</AlertDescription>
          </Box>
        </Alert>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          Retry
        </Button>
      </Stack>
    )
  }

  if (!data) {
    return <Text color="muted">Loading usage…</Text>
  }

  const { used, limits: rawLimits, plan_tier, remaining } = data
  const limits = rawLimits as Limits

  const row = (
    label: string,
    u: number,
    cap: number | null,
    remFromApi: number | null,
  ) => ({
    label,
    u,
    cap,
    rem: cap == null ? null : remFromApi ?? Math.max(0, cap - u),
  })

  const rows = [
    row('Leads (this month)', used.leads, limits.leads_per_month, remaining.leads),
    row(
      'AI assistant messages (user)',
      used.ai_assistant_messages,
      limits.ai_assistant_messages_per_month,
      remaining.ai_assistant_messages,
    ),
    row(
      'Outbound follow-up messages',
      used.follow_up_messages,
      limits.follow_up_automations_per_month,
      remaining.follow_up_automations,
    ),
  ]

  const isFree = plan_tier === 'free'

  return (
    <Stack spacing={8}>
      <Stack spacing={2}>
        <Heading as="h1" size="lg">
          Usage
        </Heading>
        <Text color="muted" fontSize="sm">
          Billing period: {data.period}. Current plan: <strong>{plan_tier}</strong>. Limits reset each calendar month.
        </Text>
      </Stack>

      <Stack spacing={6}>
        {rows.map((r) => (
          <Box key={r.label}>
            <Stack direction="row" justify="space-between" mb={1} flexWrap="wrap" gap={1}>
              <Text fontSize="sm" fontWeight="medium">
                {r.label}
              </Text>
              <Text fontSize="sm" color="muted">
                {r.cap == null ? (
                  `${r.u.toLocaleString()} used · unlimited`
                ) : (
                  <>
                    {r.u.toLocaleString()} / {r.cap.toLocaleString()} · {(r.rem ?? 0).toLocaleString()} left
                  </>
                )}
              </Text>
            </Stack>
            {r.cap != null ? (
              <Progress value={pct(r.u, r.cap)} size="sm" borderRadius="full" colorScheme="purple" />
            ) : null}
          </Box>
        ))}
      </Stack>

      <Box borderWidth="1px" borderColor="whiteAlpha.200" borderRadius="xl" p={6} bg="whiteAlpha.50">
        <Text fontWeight="semibold" mb={2}>
          {isFree ? 'Need higher limits?' : 'Manage your subscription'}
        </Text>
        <Text fontSize="sm" color="muted" mb={4}>
          {isFree
            ? 'Upgrade to Pro or Pro+ for unlimited leads, AI messages, and follow-ups on supported plans.'
            : 'Change billing interval, payment method, or downgrade from Plan & billing.'}
        </Text>
        <Button as={NextLink as any} href="/profile/billing" colorScheme="purple" size="sm">
          {isFree ? 'Upgrade plan' : 'Open plan & billing'}
        </Button>
      </Box>
    </Stack>
  )
}
