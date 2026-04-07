'use client'

import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import * as React from 'react'
import {
  FiMessageCircle,
  FiBell,
  FiBarChart2,
  FiShare2,
} from 'react-icons/fi'

import { brand } from './tokens'
import { RevealBox } from './reveal-box'

const items = [
  {
    icon: FiMessageCircle,
    title: 'Automated follow-ups',
    body: 'Sequences that feel personal — without typing the same message twice.',
  },
  {
    icon: FiBell,
    title: 'Smart reminders',
    body: 'Know exactly who needs attention before the moment passes.',
  },
  {
    icon: FiBarChart2,
    title: 'Lead tracking',
    body: 'One clear view of status from new to won.',
  },
  {
    icon: FiShare2,
    title: 'Multi-channel messaging',
    body: 'Meet leads where they are — WhatsApp, email, and more.',
  },
] as const

export function FeaturesEssentialSection() {
  return (
    <Box
      as="section"
      id="features"
      py={{ base: '20', md: '28' }}
      bg="white"
      _dark={{ bg: 'gray.950' }}
    >
      <Container maxW="container.xl">
        <RevealBox maxW="2xl" mb={{ base: 12, md: 16 }}>
          <Heading
            as="h2"
            fontSize={{ base: '3xl', md: '4xl' }}
            fontWeight="semibold"
            letterSpacing="-0.02em"
            color={brand.ink}
            _dark={{ color: 'white' }}
            mb={4}
          >
            Everything you need. Nothing you don’t.
          </Heading>
          <Text fontSize="lg" color="gray.600" _dark={{ color: 'gray.400' }}>
            A focused toolkit to protect pipeline and protect your time.
          </Text>
        </RevealBox>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 8, md: 10 }}>
          {items.map((item, i) => (
            <RevealBox key={item.title} delay={0.06 * i}>
              <HStackLike
                icon={item.icon}
                title={item.title}
                body={item.body}
              />
            </RevealBox>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  )
}

function HStackLike({
  icon: IconEl,
  title,
  body,
}: {
  icon: React.ElementType
  title: string
  body: string
}) {
  return (
    <FlexRow>
      <Box
        flexShrink={0}
        w={12}
        h={12}
        rounded="lg"
        bg="blackAlpha.50"
        _dark={{ bg: 'whiteAlpha.100' }}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Box as={IconEl as any} boxSize={6} color={brand.gold} aria-hidden />
      </Box>
      <VStack align="flex-start" spacing={2}>
        <Heading as="h3" size="sm" fontWeight="semibold">
          {title}
        </Heading>
        <Text color="gray.600" _dark={{ color: 'gray.400' }}>
          {body}
        </Text>
      </VStack>
    </FlexRow>
  )
}

function FlexRow({ children }: { children: React.ReactNode }) {
  return (
    <Box display="flex" gap={6} alignItems="flex-start">
      {children}
    </Box>
  )
}
