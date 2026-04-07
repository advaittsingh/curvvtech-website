'use client'

import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'

import { ButtonLink } from '#components/button-link/button-link'

import { brand } from './tokens'
import { RevealBox } from './reveal-box'

export function FooterCtaSection() {
  return (
    <Box
      as="section"
      id="get-started"
      py={{ base: '20', md: '28' }}
      bg={brand.ink}
      color="white"
    >
      <Container maxW="container.lg">
        <RevealBox>
          <VStack spacing={8} textAlign="center" py={{ base: 4, md: 8 }}>
            <Heading
              as="h2"
              fontSize={{ base: '3xl', md: '4xl' }}
              fontWeight="semibold"
              letterSpacing="-0.02em"
            >
              Start closing more leads today
            </Heading>
            <Text fontSize="lg" color="whiteAlpha.800" maxW="xl">
              Book a short demo — we’ll show you the workflow and next steps
              for your business.
            </Text>
            <ButtonLink
              href="/demo"
              size="lg"
              rounded="full"
              px={10}
              bg={brand.gold}
              color={brand.ink}
              _hover={{ bg: brand.goldHover }}
              fontWeight="semibold"
            >
              Book a Demo
            </ButtonLink>
          </VStack>
        </RevealBox>
      </Container>
    </Box>
  )
}
