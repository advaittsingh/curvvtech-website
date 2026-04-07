'use client'

import { Box, Container, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { FiBriefcase, FiCoffee, FiHome, FiTool } from 'react-icons/fi'

import { brand } from './tokens'
import { RevealBox } from './reveal-box'

const cases = [
  {
    icon: FiBriefcase,
    title: 'Agencies',
    body: 'Keep every prospect moving without another status meeting.',
  },
  {
    icon: FiCoffee,
    title: 'Cafes',
    body: 'Turn inquiries and event requests into repeat visits.',
  },
  {
    icon: FiHome,
    title: 'Real Estate',
    body: 'Stay top-of-mind from first tour to signed contract.',
  },
  {
    icon: FiTool,
    title: 'Service Businesses',
    body: 'Quotes and bookings don’t stall when follow-up runs itself.',
  },
] as const

export function UseCasesSection() {
  return (
    <Box
      as="section"
      id="use-cases"
      py={{ base: '20', md: '28' }}
      bg="gray.50"
      _dark={{ bg: 'gray.900' }}
    >
      <Container maxW="container.xl">
        <RevealBox textAlign="center" maxW="2xl" mx="auto" mb={{ base: 12, md: 16 }}>
          <Heading
            as="h2"
            fontSize={{ base: '3xl', md: '4xl' }}
            fontWeight="semibold"
            letterSpacing="-0.02em"
            color={brand.ink}
            _dark={{ color: 'white' }}
            mb={4}
          >
            Built for teams that live in conversations
          </Heading>
          <Text fontSize="lg" color="gray.600" _dark={{ color: 'gray.400' }}>
            Whether you sell retainers, lattes, or listings — the same rule
            applies: follow up, or lose the deal.
          </Text>
        </RevealBox>
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={8}>
          {cases.map((c, i) => (
            <RevealBox key={c.title} delay={0.06 * i}>
              <VStack
                align="flex-start"
                spacing={4}
                h="full"
                p={8}
                rounded="xl"
                bg="white"
                borderWidth="1px"
                borderColor={brand.line}
                _dark={{ bg: 'gray.950', borderColor: 'whiteAlpha.100' }}
              >
                <Box as={c.icon} boxSize={6} color={brand.gold} aria-hidden />
                <Heading as="h3" size="md" fontWeight="semibold">
                  {c.title}
                </Heading>
                <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                  {c.body}
                </Text>
              </VStack>
            </RevealBox>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  )
}
