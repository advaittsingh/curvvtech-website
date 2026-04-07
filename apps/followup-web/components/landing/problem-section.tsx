'use client'

import { Box, Container, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { FiClock, FiUserX, FiTrendingDown } from 'react-icons/fi'

import { brand } from './tokens'
import { RevealBox } from './reveal-box'

const pains = [
  {
    icon: FiTrendingDown,
    title: 'Leads go cold',
    body: 'Interest fades fast when nobody reaches back at the right moment.',
  },
  {
    icon: FiClock,
    title: 'You forget to follow up',
    body: 'Busy days mean good opportunities slip through the cracks.',
  },
  {
    icon: FiUserX,
    title: 'Manual follow-ups don’t scale',
    body: 'Spreadsheets and memory don’t work when volume picks up.',
  },
] as const

export function ProblemSection() {
  return (
    <Box
      as="section"
      id="problem"
      py={{ base: '20', md: '28' }}
      bg="gray.50"
      _dark={{ bg: 'gray.900' }}
    >
      <Container maxW="container.xl">
        <RevealBox maxW="3xl" mb={{ base: 12, md: 16 }}>
          <Heading
            as="h2"
            fontSize={{ base: '3xl', md: '4xl' }}
            fontWeight="semibold"
            letterSpacing="-0.02em"
            mb={4}
            color={brand.ink}
            _dark={{ color: 'white' }}
          >
            The cost of silent leads
          </Heading>
          <Text fontSize="lg" color="gray.600" _dark={{ color: 'gray.400' }}>
            Most teams don’t lose on the pitch — they lose in the gap between
            first touch and the next message.
          </Text>
        </RevealBox>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
          {pains.map((item, i) => (
            <RevealBox key={item.title} delay={0.06 * i}>
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
                transition="box-shadow 0.2s ease"
                _hover={{ boxShadow: 'md' }}
              >
                <Box
                  as={item.icon}
                  boxSize={6}
                  color={brand.gold}
                  aria-hidden
                />
                <Heading as="h3" size="md" fontWeight="semibold">
                  {item.title}
                </Heading>
                <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                  {item.body}
                </Text>
              </VStack>
            </RevealBox>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  )
}
