'use client'

import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  VStack,
} from '@chakra-ui/react'

import { brand } from './tokens'
import { RevealBox } from './reveal-box'

const steps = [
  {
    step: '1',
    title: 'Capture leads',
    body: 'Bring conversations in from the channels you already use.',
  },
  {
    step: '2',
    title: 'Automate follow-ups',
    body: 'WhatsApp and email sequences keep every lead warm — on autopilot.',
  },
  {
    step: '3',
    title: 'Convert customers',
    body: 'See who’s engaged and close while intent is still high.',
  },
] as const

export function SolutionSection() {
  return (
    <Box
      as="section"
      id="how-it-works"
      py={{ base: '20', md: '28' }}
      bg="white"
      _dark={{ bg: 'gray.950' }}
    >
      <Container maxW="container.xl">
        <RevealBox maxW="2xl" mb={{ base: 12, md: 16 }}>
          <Text
            fontSize="sm"
            fontWeight="semibold"
            letterSpacing="0.08em"
            textTransform="uppercase"
            color={brand.gold}
            mb={3}
          >
            How it works
          </Text>
          <Heading
            as="h2"
            fontSize={{ base: '3xl', md: '4xl' }}
            fontWeight="semibold"
            letterSpacing="-0.02em"
            color={brand.ink}
            _dark={{ color: 'white' }}
          >
            From first hello to booked revenue
          </Heading>
        </RevealBox>
        <VStack spacing={0} align="stretch" maxW="3xl">
          {steps.map((s, i) => (
            <RevealBox key={s.step} delay={0.08 * i}>
              <Flex
                gap={{ base: 4, md: 8 }}
                py={{ base: 8, md: 10 }}
                borderTopWidth={i === 0 ? 0 : '1px'}
                borderColor={brand.line}
                _dark={{ borderColor: 'whiteAlpha.100' }}
              >
                <Flex
                  align="center"
                  justify="center"
                  flexShrink={0}
                  w={12}
                  h={12}
                  rounded="full"
                  bg={brand.ink}
                  color="white"
                  _dark={{ bg: 'white', color: brand.ink }}
                  fontWeight="bold"
                  fontSize="lg"
                >
                  {s.step}
                </Flex>
                <VStack align="flex-start" spacing={2}>
                  <Heading as="h3" size="md" fontWeight="semibold">
                    {s.title}
                  </Heading>
                  <Text
                    fontSize="lg"
                    color="gray.600"
                    _dark={{ color: 'gray.400' }}
                  >
                    {s.body}
                  </Text>
                </VStack>
              </Flex>
            </RevealBox>
          ))}
        </VStack>
      </Container>
    </Box>
  )
}
