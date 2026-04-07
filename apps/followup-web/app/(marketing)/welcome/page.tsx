'use client'

import { Box, Center, Heading, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import { getApiOrigin, landingHeaders, v1ApiPath } from '#lib/followup-api'

/** March 30, 2026, 10:00 AM in the viewer's local timezone */
const LAUNCH = new Date(2026, 2, 30, 10, 0, 0)

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function WelcomePage() {
  const [now, setNow] = useState(() => Date.now())
  const [displayedCount, setDisplayedCount] = useState(0)
  const [targetCount, setTargetCount] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let mounted = true

    const loadCount = async () => {
      try {
        if (!getApiOrigin()) return
        const res = await fetch(v1ApiPath('public/waitlist/count'), {
          cache: 'no-store',
          headers: landingHeaders(),
        })
        if (!res.ok) return
        const data = await res.json()
        const next = Number(data?.total || 0)
        if (mounted && Number.isFinite(next)) {
          setTargetCount(next)
        }
      } catch {
        // Keep UI stable if counting endpoint is temporarily unavailable.
      }
    }

    void loadCount()
    const id = window.setInterval(loadCount, 4000)
    return () => {
      mounted = false
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    if (displayedCount >= targetCount) return

    const diff = targetCount - displayedCount
    const steps = Math.min(diff, 30)
    const increment = Math.max(1, Math.ceil(diff / steps))
    const id = window.setInterval(() => {
      setDisplayedCount((prev) => {
        const next = Math.min(prev + increment, targetCount)
        if (next >= targetCount) {
          window.clearInterval(id)
        }
        return next
      })
    }, 40)

    return () => window.clearInterval(id)
  }, [displayedCount, targetCount])

  const diff = LAUNCH.getTime() - now
  const live = diff <= 0

  let hours = 0
  let minutes = 0
  let seconds = 0
  if (!live) {
    const totalSec = Math.floor(diff / 1000)
    hours = Math.floor(totalSec / 3600)
    minutes = Math.floor((totalSec % 3600) / 60)
    seconds = totalSec % 60
  }

  return (
    <Center minH="calc(100vh - 200px)" px="6" py="16">
      <Stack spacing="8" textAlign="center" maxW="lg">
        <Box
          mx="auto"
          px="4"
          py="2"
          borderRadius="full"
          borderWidth="1px"
          borderColor="purple.400"
          bg="whiteAlpha.100"
          fontSize="sm"
          fontWeight="semibold"
        >
          Limited slots: {displayedCount.toLocaleString()} signups
        </Box>

        <Heading as="h1" size="xl">
          You&apos;re in 🚀
        </Heading>
        <Text color="muted" fontSize="lg">
          We&apos;re launching soon. You&apos;ll be among the first to try it.
        </Text>

        {live ? (
          <Text fontSize="2xl" fontWeight="semibold">
            We are live 🚀
          </Text>
        ) : (
          <Box
            fontFamily="mono"
            fontSize={{ base: '2xl', md: '3xl' }}
            letterSpacing="wider"
            aria-live="polite"
          >
            {pad(hours)}:{pad(minutes)}:{pad(seconds)}
          </Box>
        )}
      </Stack>
    </Center>
  )
}
