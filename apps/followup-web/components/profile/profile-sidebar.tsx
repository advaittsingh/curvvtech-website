'use client'

import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Stack,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'

import { PROFILE_SIDEBAR_ITEMS } from '#components/profile/profile-nav-items'

export function ProfileSidebar() {
  const pathname = usePathname()
  const isMobile = useBreakpointValue({ base: true, lg: false })

  const linkStyle = (active: boolean) => ({
    display: 'block',
    w: 'full',
    textAlign: 'left' as const,
    px: 4,
    py: 3,
    borderRadius: 'lg',
    fontWeight: active ? 'semibold' : 'medium',
    bg: active ? 'whiteAlpha.200' : 'transparent',
    borderWidth: '1px',
    borderColor: active ? 'purple.400' : 'whiteAlpha.100',
    color: active ? 'white' : 'whiteAlpha.800',
    _hover: { bg: 'whiteAlpha.100' },
  })

  const normalize = (p: string | null) => {
    if (!p) return '/profile'
    if (p === '/profile') return '/profile'
    return p
  }

  const current = normalize(pathname)

  if (isMobile) {
    return (
      <Box as="nav" aria-label="Profile sections" mb={6}>
        <Text fontSize="xs" color="muted" textTransform="uppercase" letterSpacing="wider" mb={2}>
          Sections
        </Text>
        <Accordion allowToggle defaultIndex={[]}>
          {PROFILE_SIDEBAR_ITEMS.map((it) => {
            const active = current === it.href
            return (
              <AccordionItem
                key={it.href}
                borderWidth="1px"
                borderColor="whiteAlpha.200"
                borderRadius="md"
                mb={2}
                bg={active ? 'whiteAlpha.100' : 'transparent'}
              >
                <AccordionButton px={3} py={3} borderRadius="md">
                  <Box flex="1" textAlign="left">
                    <Text fontWeight={active ? 'semibold' : 'medium'} fontSize="sm">
                      {it.label}
                    </Text>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pt={0} pb={3} px={3}>
                  <Text fontSize="xs" color="muted" mb={3}>
                    {it.description}
                  </Text>
                  <Button
                    as={NextLink as any}
                    href={it.href}
                    size="sm"
                    w="full"
                    colorScheme={active ? 'purple' : 'gray'}
                    variant={active ? 'solid' : 'outline'}
                  >
                    Open
                  </Button>
                </AccordionPanel>
              </AccordionItem>
            )
          })}
        </Accordion>
      </Box>
    )
  }

  return (
    <Box
      as="nav"
      aria-label="Profile sections"
      minW="220px"
      flexShrink={0}
      position={{ base: 'relative', lg: 'sticky' }}
      top={{ lg: 24 }}
      alignSelf="flex-start"
    >
      <Text fontSize="xs" color="muted" textTransform="uppercase" letterSpacing="wider" mb={3} px={2}>
        Profile
      </Text>
      <Stack spacing={1}>
        {PROFILE_SIDEBAR_ITEMS.map((it) => {
          const active = current === it.href
          return (
            <NextLink key={it.href} href={it.href} style={{ textDecoration: 'none' }}>
              <Box {...linkStyle(active)}>{it.label}</Box>
            </NextLink>
          )
        })}
      </Stack>
    </Box>
  )
}
