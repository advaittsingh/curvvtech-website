'use client'

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import * as React from 'react'

import { ButtonLink } from '#components/button-link/button-link'
import { BackgroundGradient } from '#components/gradients/background-gradient'
import { minDemoBookingYmd } from '#lib/demo-booking-dates'
import { parseApiError } from '#lib/followup-api'

/** Demo booking uses this app’s Next.js routes + Neon (same DB as auth/waitlist). */
const DEMO_API = '/api/demo'

function DemoPageShell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      position="relative"
      overflow="hidden"
      minH="70vh"
      pt="32"
      pb="24"
    >
      <BackgroundGradient
        position="absolute"
        inset={0}
        height="100%"
        minH="100%"
        width="100%"
      />
      <Container maxW="container.md" position="relative" zIndex={1}>
        <Box
          bg="whiteAlpha.900"
          backdropFilter="blur(12px)"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="whiteAlpha.700"
          boxShadow="lg"
          p={{ base: 6, md: 10 }}
          _dark={{
            bg: 'blackAlpha.500',
            borderColor: 'whiteAlpha.200',
          }}
        >
          {children}
        </Box>
      </Container>
    </Box>
  )
}

type Slot = { id: string; date: string; time: string; is_booked: boolean }

function weekdayUtcFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return -1
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

function isWeekdayYmd(ymd: string): boolean {
  const w = weekdayUtcFromYmd(ymd)
  return w >= 1 && w <= 5
}

export function DemoBookingWizard() {
  const [date, setDate] = React.useState('')
  const [slots, setSlots] = React.useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = React.useState(false)
  const [slotsError, setSlotsError] = React.useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = React.useState<Slot | null>(null)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [company, setCompany] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState<{
    date: string
    time: string
  } | null>(null)

  const minBookableYmd = React.useMemo(() => minDemoBookingYmd(), [])

  React.useEffect(() => {
    setDate((prev) => (prev && prev < minBookableYmd ? '' : prev))
  }, [minBookableYmd])

  const loadSlots = React.useCallback(async (d: string) => {
    setSlotsLoading(true)
    setSlotsError(null)
    setSlots([])
    setSelectedSlot(null)
    try {
      const res = await fetch(
        `${DEMO_API}/slots?date=${encodeURIComponent(d)}`,
      )
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        setSlotsError(parseApiError(data))
        return
      }
      const list = data.slots
      setSlots(Array.isArray(list) ? (list as Slot[]) : [])
    } catch {
      setSlotsError('Could not load times. Try again.')
    } finally {
      setSlotsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!date || date < minBookableYmd || !isWeekdayYmd(date)) {
      setSlots([])
      setSelectedSlot(null)
      setSlotsError(null)
      return
    }
    void loadSlots(date)
  }, [date, loadSlots, minBookableYmd])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!date || date < minBookableYmd) {
      setFormError('Choose a date on or after 10 April.')
      return
    }
    if (!isWeekdayYmd(date)) {
      setFormError('Choose a weekday (Monday–Friday).')
      return
    }
    if (!selectedSlot) {
      setFormError('Select a time slot.')
      return
    }
    if (!name.trim() || !email.trim()) {
      setFormError('Name and email are required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${DEMO_API}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          time: selectedSlot.time,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          company: company.trim() || undefined,
        }),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        setFormError(parseApiError(data))
        return
      }
      const booking = data.booking as
        | { date?: string; time?: string }
        | undefined
      setDone({
        date: booking?.date ?? date,
        time: booking?.time ?? selectedSlot.time,
      })
    } catch {
      setFormError('Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <DemoPageShell>
        <VStack align="stretch" spacing={6}>
          <Alert status="success" borderRadius="lg" variant="subtle">
            <AlertIcon />
            You&apos;re booked. We&apos;ll contact you shortly to confirm.
          </Alert>
          <Box>
            <Heading size="lg" mb={2}>
              Demo scheduled
            </Heading>
            <Text color="gray.600" _dark={{ color: 'gray.300' }} fontSize="lg">
              {done.date} at {done.time}
            </Text>
          </Box>
          <ButtonLink
            href="/"
            variant="outline"
            colorScheme="primary"
            w="fit-content"
          >
            Back to home
          </ButtonLink>
        </VStack>
      </DemoPageShell>
    )
  }

  return (
    <DemoPageShell>
      <VStack as="form" onSubmit={onSubmit} align="stretch" spacing={8}>
        <Box>
          <Heading
            as="h1"
            fontSize={{ base: '4xl', md: '5xl' }}
            fontWeight="semibold"
            letterSpacing="-0.03em"
            mb={2}
            bgGradient="linear(to-r, primary.600, secondary.500)"
            bgClip="text"
            sx={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            _dark={{
              bgGradient: 'linear(to-r, primary.300, secondary.300)',
            }}
          >
            Book a demo
          </Heading>
          <Text fontSize="md" color="gray.600" _dark={{ color: 'gray.400' }}>
            Pick a weekday, choose a time, and leave your details. Demos are
            30-minute windows, 9:00–17:00.
          </Text>
        </Box>

        <FormControl>
          <FormLabel>Date</FormLabel>
          <Input
            type="date"
            value={date}
            min={minBookableYmd}
            onChange={(e) => {
              setDate(e.target.value)
              setFormError(null)
            }}
            size="lg"
          />
        </FormControl>

        {date && !isWeekdayYmd(date) ? (
          <Text color="orange.500" fontSize="sm">
            Weekends are unavailable — choose Monday through Friday.
          </Text>
        ) : null}

        {date && isWeekdayYmd(date) ? (
          <Box>
            <FormLabel mb={3}>Time</FormLabel>
            {slotsLoading && (
              <Text color="gray.500" fontSize="sm">
                Loading times…
              </Text>
            )}
            {slotsError && (
              <Text color="red.500" fontSize="sm" mb={2}>
                {slotsError}
              </Text>
            )}
            {!slotsLoading &&
              !slotsError &&
              slots.length === 0 &&
              date &&
              isWeekdayYmd(date) && (
                <Text color="gray.500" fontSize="sm">
                  No open slots that day. Try another date.
                </Text>
              )}
            <SimpleGrid columns={{ base: 2, sm: 3 }} spacing={3}>
              {slots.map((s) => (
                <Button
                  key={s.id}
                  type="button"
                  colorScheme="primary"
                  variant={selectedSlot?.id === s.id ? 'solid' : 'outline'}
                  onClick={() => {
                    setSelectedSlot(s)
                    setFormError(null)
                  }}
                >
                  {s.time}
                </Button>
              ))}
            </SimpleGrid>
          </Box>
        ) : null}

        <FormControl isRequired>
          <FormLabel>Name</FormLabel>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setFormError(null)
            }}
            size="lg"
            autoComplete="name"
          />
        </FormControl>
        <FormControl isRequired>
          <FormLabel>Email</FormLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setFormError(null)
            }}
            size="lg"
            autoComplete="email"
          />
        </FormControl>
        <FormControl>
          <FormLabel>Phone</FormLabel>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            size="lg"
            autoComplete="tel"
          />
        </FormControl>
        <FormControl>
          <FormLabel>Company</FormLabel>
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            size="lg"
            autoComplete="organization"
          />
        </FormControl>

        {formError ? (
          <Text color="red.500" fontSize="sm">
            {formError}
          </Text>
        ) : null}

        <Button
          type="submit"
          colorScheme="primary"
          size="lg"
          rounded="full"
          w="fit-content"
          isLoading={submitting}
          loadingText="Booking…"
        >
          Book demo
        </Button>
      </VStack>
    </DemoPageShell>
  )
}
