'use client'

import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  Link,
  List,
  ListIcon,
  ListItem,
  Stack,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useToast,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { MdCheckCircle } from 'react-icons/md'

import {
  deletePaymentMethod,
  fetchBillingPlans,
  fetchBillingSummary,
  fetchInvoices,
  patchDefaultPaymentMethod,
  postCardSetupOrder,
  postDowngrade,
  postSubscribe,
  postVerifyPayment,
  type BillingInvoiceRow,
  type BillingPlansResponse,
  type BillingSummary,
} from '#lib/followup-billing'

function loadRzpScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-rzp="1"]')
    if (existing) {
      const t = window.setInterval(() => {
        if (window.Razorpay) {
          window.clearInterval(t)
          resolve()
        }
      }, 50)
      window.setTimeout(() => {
        window.clearInterval(t)
        if (window.Razorpay) resolve()
        else reject(new Error('Razorpay script timeout'))
      }, 5000)
      return
    }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.dataset.rzp = '1'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.body.appendChild(s)
  })
}

/** Shown on upgrade cards — aligned with marketing pricing and API plan limits. */
const PLAN_PERKS: Record<'pro' | 'pro_plus', string[]> = {
  pro: [
    'Unlimited leads, AI replies, and follow-up automations (on supported plans)',
    'Full WhatsApp CRM pipeline (New / Pending / Closed)',
    'Smart reminders, scheduling, and organized inbox',
    'Business insights & basic analytics',
  ],
  pro_plus: [
    'Everything in Pro',
    'Multi-number & team-ready workflows',
    'Advanced analytics & automation depth',
    'Priority support, custom integrations & scaling',
  ],
}

export default function ProfileBillingPage() {
  const toast = useToast()
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error' | 'unconfigured'>('loading')
  const [loadError, setLoadError] = useState('')
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [invoices, setInvoices] = useState<BillingInvoiceRow[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [plansInfo, setPlansInfo] = useState<BillingPlansResponse | null>(null)
  /** false = monthly, true = annual — one toggle per paid tier */
  const [annualPro, setAnnualPro] = useState(false)
  const [annualProPlus, setAnnualProPlus] = useState(false)

  const refresh = useCallback(async () => {
    setLoadState('loading')
    setLoadError('')
    const [s, inv, plans] = await Promise.all([fetchBillingSummary(), fetchInvoices(), fetchBillingPlans()])
    if (!s.ok && s.status === 0) {
      setSummary(null)
      setLoadState('unconfigured')
      setLoadError(s.message)
      return
    }
    if (!s.ok) {
      setSummary(null)
      setLoadState('error')
      setLoadError(
        s.status === 401 ? 'Your session expired. Sign in again to view billing.' : s.message,
      )
      return
    }
    if (!inv.ok) {
      setSummary(null)
      setLoadState('error')
      setLoadError(
        inv.status === 401 ? 'Your session expired. Sign in again to view billing.' : inv.message,
      )
      return
    }
    if (!plans.ok) {
      setSummary(null)
      setLoadState('error')
      setLoadError(
        plans.status === 401 ? 'Your session expired. Sign in again to view billing.' : plans.message,
      )
      return
    }
    setSummary(s.data)
    setInvoices(inv.data)
    setPlansInfo(plans.data)
    setLoadState('ready')
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const openCardSetup = async () => {
    setBusy('card')
    try {
      await loadRzpScript()
      const o = await postCardSetupOrder()
      const Rzp = window.Razorpay
      if (!Rzp) throw new Error('Razorpay not available')

      const options: Record<string, unknown> = {
        key: o.key_id,
        amount: o.amount,
        currency: o.currency,
        order_id: o.order_id,
        name: 'FollowUp',
        description: 'Save card (₹1)',
        handler: async (response: {
          razorpay_payment_id: string
          razorpay_order_id: string
          razorpay_signature: string
        }) => {
          try {
            await postVerifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            })
            toast({ title: 'Payment method saved', status: 'success' })
            await refresh()
          } catch (e) {
            toast({ title: e instanceof Error ? e.message : 'Verification failed', status: 'error' })
          }
        },
        prefill: { email: o.email, name: o.name },
        theme: { color: '#7C3AED' },
      }

      const rzp = new Rzp(options)
      rzp.open()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Could not start checkout', status: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const subscribe = async (plan: 'pro' | 'pro_plus', interval: 'monthly' | 'annual') => {
    setBusy(`sub-${plan}-${interval}`)
    try {
      const { short_url } = await postSubscribe(plan, interval)
      if (short_url) {
        window.open(short_url, '_blank', 'noopener,noreferrer')
        toast({ title: 'Complete payment in the new tab', status: 'info' })
      } else {
        toast({ title: 'Subscription created — check Razorpay dashboard for status', status: 'success' })
      }
      await refresh()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Subscribe failed', status: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const downgrade = async () => {
    setBusy('down')
    try {
      await postDowngrade()
      toast({ title: 'Moved to Free plan', status: 'success' })
      await refresh()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Downgrade failed', status: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const setDefault = async (id: string) => {
    try {
      await patchDefaultPaymentMethod(id)
      toast({ title: 'Default payment method updated', status: 'success' })
      await refresh()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Update failed', status: 'error' })
    }
  }

  const removePm = async (id: string) => {
    try {
      await deletePaymentMethod(id)
      toast({ title: 'Removed', status: 'success' })
      await refresh()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Could not remove', status: 'error' })
    }
  }

  if (loadState === 'loading') {
    return (
      <Text color="muted">
        Loading billing…{' '}
        <Button size="sm" variant="link" onClick={() => void refresh()}>
          Retry
        </Button>
      </Text>
    )
  }

  if (loadState === 'error' || loadState === 'unconfigured') {
    return (
      <Stack spacing={3}>
        <Alert status="error" borderRadius="md" variant="subtle">
          <AlertIcon />
          <Box>
            <AlertTitle fontSize="sm">
              {loadState === 'unconfigured' ? 'Not configured' : 'Could not load billing'}
            </AlertTitle>
            <AlertDescription fontSize="sm">{loadError}</AlertDescription>
          </Box>
        </Alert>
        {loadState === 'error' ? (
          <Button as={NextLink as any} href="/login" size="sm" colorScheme="purple" w="fit-content">
            Sign in
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={() => void refresh()}>
          Retry
        </Button>
      </Stack>
    )
  }

  if (!summary) {
    return (
      <Text color="muted">
        Loading billing…{' '}
        <Button size="sm" variant="link" onClick={() => void refresh()}>
          Retry
        </Button>
      </Text>
    )
  }

  const tier = summary.plan_tier
  const paid = tier === 'pro' || tier === 'pro_plus'
  const paidLive = summary.paid_subscription_active ?? paid
  const onlyOnePm = summary.payment_methods.length <= 1

  return (
    <Stack spacing={8}>
      <Stack spacing={2}>
        <Heading as="h1" size="lg">
          Plan &amp; billing
        </Heading>
        <Text color="muted" fontSize="sm">
          Manage your subscription, payment methods, and invoices.
        </Text>
      </Stack>

      {summary.has_razorpay && summary.payment_required ? (
        <Alert status="warning" borderRadius="lg" bg="whiteAlpha.100" borderWidth="1px" borderColor="orange.400">
          <AlertIcon />
          <Box>
            <AlertTitle fontSize="sm">Add a payment method</AlertTitle>
            <AlertDescription fontSize="sm">
              Your account should always have at least one saved card. Use “Add card” below, then you can add extras or
              switch the default.
            </AlertDescription>
          </Box>
        </Alert>
      ) : null}

      <Box borderWidth="1px" borderColor="whiteAlpha.200" borderRadius="xl" p={6} bg="whiteAlpha.50">
        <Stack direction="row" justify="space-between" align="center" flexWrap="wrap" gap={2}>
          <Text fontWeight="semibold">Current plan</Text>
          <Badge colorScheme="purple" textTransform="uppercase">
            {tier}
          </Badge>
        </Stack>
        <Text fontSize="sm" color="muted" mt={2}>
          New accounts default to <strong>free</strong>. Upgrade below to unlock higher limits (see Usage).
        </Text>
        {paidLive && summary.payment_required ? (
          <Text fontSize="sm" color="orange.300" mt={2}>
            Add a payment method so your subscription can be charged reliably.
          </Text>
        ) : null}
        {paid ? (
          <Button mt={4} size="sm" variant="outline" isLoading={busy === 'down'} onClick={() => void downgrade()}>
            Downgrade to Free
          </Button>
        ) : null}
      </Box>

      <Box borderWidth="1px" borderColor="whiteAlpha.200" borderRadius="xl" p={6} bg="whiteAlpha.50">
        <Text fontWeight="semibold" mb={2}>
          Payment methods
        </Text>
        <Text fontSize="sm" color="muted" mb={4}>
          Cards are tokenized by Razorpay. Set one as default for subscriptions; you cannot remove your last method—add
          another first. Update default anytime.
        </Text>
        <Button mb={4} isLoading={busy === 'card'} isDisabled={!summary.has_razorpay} onClick={() => void openCardSetup()}>
          Add card (₹1 authorization)
        </Button>
        <Stack spacing={3}>
          {summary.payment_methods.length === 0 ? (
            <Text fontSize="sm" color="muted">
              No saved methods yet.
            </Text>
          ) : (
            summary.payment_methods.map((pm) => (
              <Stack
                key={pm.id}
                direction={{ base: 'column', sm: 'row' }}
                align={{ sm: 'center' }}
                justify="space-between"
                p={3}
                borderRadius="md"
                bg="blackAlpha.300"
                spacing={2}
              >
                <Text fontSize="sm">
                  {pm.brand || pm.method} ·••• {pm.last4}
                  {pm.is_default ? (
                    <Badge ml={2} colorScheme="green">
                      Default
                    </Badge>
                  ) : null}
                </Text>
                <Stack direction="row" spacing={2}>
                  {!pm.is_default ? (
                    <Button size="xs" variant="ghost" onClick={() => void setDefault(pm.id)}>
                      Set default
                    </Button>
                  ) : null}
                  <Tooltip
                    label="Add another card before removing this one."
                    isDisabled={!onlyOnePm}
                    hasArrow
                    placement="top"
                  >
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme="red"
                      isDisabled={onlyOnePm}
                      onClick={() => void removePm(pm.id)}
                    >
                      Remove
                    </Button>
                  </Tooltip>
                </Stack>
              </Stack>
            ))
          )}
        </Stack>
      </Box>

      <Box borderWidth="1px" borderColor="whiteAlpha.200" borderRadius="xl" p={6} bg="whiteAlpha.50">
        <Text fontWeight="semibold" mb={1}>
          Change plan
        </Text>
        {plansInfo?.plans?.length ? (
          <Text fontSize="xs" color="muted" mb={4}>
            Plans: {plansInfo.plans.map((p) => p.name).join(' · ')}.
          </Text>
        ) : (
          <Text fontSize="xs" color="muted" mb={4}>
            Upgrade to Pro or Pro+ for higher limits and team features.
          </Text>
        )}

        <Stack spacing={6}>
          <Box
            p={4}
            borderRadius="lg"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            bg="blackAlpha.400"
          >
            <Stack spacing={4}>
              <Stack direction={{ base: 'column', sm: 'row' }} justify="space-between" align={{ sm: 'center' }} gap={3}>
                <Box>
                  <Text fontWeight="semibold">Pro</Text>
                  <Text fontSize="xs" color="muted" mt={1}>
                    For teams scaling outreach and inbox.
                  </Text>
                </Box>
                <HStack spacing={3} align="center">
                  <Text fontSize="sm" color={annualPro ? 'muted' : 'white'} fontWeight={annualPro ? 'normal' : 'medium'}>
                    Monthly
                  </Text>
                  <Switch
                    size="lg"
                    isChecked={annualPro}
                    onChange={(e) => setAnnualPro(e.target.checked)}
                    aria-label="Toggle annual billing for Pro"
                    sx={{
                      '& .chakra-switch__track': {
                        bg: annualPro ? 'purple.500' : 'gray.700',
                      },
                      '& .chakra-switch__thumb': {
                        bg: 'white',
                      },
                    }}
                  />
                  <Text
                    fontSize="sm"
                    color={annualPro ? 'white' : 'muted'}
                    fontWeight={annualPro ? 'medium' : 'normal'}
                  >
                    Annual
                  </Text>
                </HStack>
              </Stack>
              <List spacing={2}>
                {PLAN_PERKS.pro.map((line) => (
                  <ListItem key={line} fontSize="sm" color="muted">
                    <ListIcon as={MdCheckCircle} color="purple.400" />
                    {line}
                  </ListItem>
                ))}
              </List>
              <Button
                colorScheme="purple"
                alignSelf={{ base: 'stretch', sm: 'flex-start' }}
                isLoading={busy === `sub-pro-${annualPro ? 'annual' : 'monthly'}`}
                isDisabled={!summary.has_razorpay}
                onClick={() => void subscribe('pro', annualPro ? 'annual' : 'monthly')}
              >
                {annualPro ? 'Upgrade to Pro — Annual' : 'Upgrade to Pro — Monthly'}
              </Button>
            </Stack>
          </Box>

          <Box
            p={4}
            borderRadius="lg"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            bg="blackAlpha.400"
          >
            <Stack spacing={4}>
              <Stack direction={{ base: 'column', sm: 'row' }} justify="space-between" align={{ sm: 'center' }} gap={3}>
                <Box>
                  <Text fontWeight="semibold">Pro+</Text>
                  <Text fontSize="xs" color="muted" mt={1}>
                    For teams that need scale, control, and support.
                  </Text>
                </Box>
                <HStack spacing={3} align="center">
                  <Text
                    fontSize="sm"
                    color={annualProPlus ? 'muted' : 'white'}
                    fontWeight={annualProPlus ? 'normal' : 'medium'}
                  >
                    Monthly
                  </Text>
                  <Switch
                    size="lg"
                    isChecked={annualProPlus}
                    onChange={(e) => setAnnualProPlus(e.target.checked)}
                    aria-label="Toggle annual billing for Pro+"
                    sx={{
                      '& .chakra-switch__track': {
                        bg: annualProPlus ? 'pink.500' : 'gray.700',
                      },
                      '& .chakra-switch__thumb': {
                        bg: 'white',
                      },
                    }}
                  />
                  <Text
                    fontSize="sm"
                    color={annualProPlus ? 'white' : 'muted'}
                    fontWeight={annualProPlus ? 'medium' : 'normal'}
                  >
                    Annual
                  </Text>
                </HStack>
              </Stack>
              <List spacing={2}>
                {PLAN_PERKS.pro_plus.map((line) => (
                  <ListItem key={line} fontSize="sm" color="muted">
                    <ListIcon as={MdCheckCircle} color="pink.400" />
                    {line}
                  </ListItem>
                ))}
              </List>
              <Button
                colorScheme="pink"
                alignSelf={{ base: 'stretch', sm: 'flex-start' }}
                isLoading={busy === `sub-pro_plus-${annualProPlus ? 'annual' : 'monthly'}`}
                isDisabled={!summary.has_razorpay}
                onClick={() => void subscribe('pro_plus', annualProPlus ? 'annual' : 'monthly')}
              >
                {annualProPlus ? 'Upgrade to Pro+ — Annual' : 'Upgrade to Pro+ — Monthly'}
              </Button>
            </Stack>
          </Box>
        </Stack>

        <Text fontSize="xs" color="muted" mt={4}>
          Checkout opens in a new tab. After payment, your plan and invoices update automatically.
        </Text>
      </Box>

      <Box borderWidth="1px" borderColor="whiteAlpha.200" borderRadius="xl" p={6} bg="whiteAlpha.50">
        <Text fontWeight="semibold" mb={4}>
          Invoices
        </Text>
        {invoices.length === 0 ? (
          <Text fontSize="sm" color="muted">
            No invoices yet.
          </Text>
        ) : (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Invoice</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>PDF</Th>
                </Tr>
              </Thead>
              <Tbody>
                {invoices.map((inv) => (
                  <Tr key={inv.id}>
                    <Td fontFamily="mono" fontSize="xs">
                      {inv.razorpay_invoice_id}
                    </Td>
                    <Td>
                      {(inv.amount_cents / 100).toFixed(2)} {inv.currency}
                    </Td>
                    <Td>{inv.status}</Td>
                    <Td>
                      {inv.host_invoice_url || inv.pdf_url || inv.short_url ? (
                        <Link
                          href={(inv.host_invoice_url || inv.pdf_url || inv.short_url)!}
                          isExternal
                          color="purple.300"
                          fontSize="sm"
                        >
                          Download
                        </Link>
                      ) : (
                        '—'
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      <Divider />

      <Button as={NextLink as any} href="/usage" variant="link" color="purple.300" alignSelf="flex-start">
        View usage & limits →
      </Button>
    </Stack>
  )
}
