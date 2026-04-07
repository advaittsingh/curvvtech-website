'use client'

import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'

import { ButtonLink } from '#components/button-link/button-link'

import { brand } from './tokens'
import { RevealBox } from './reveal-box'

export function DemoCtaSection() {
  return (
    <Box
      as="section"
      id="demo"
      py={{ base: '20', md: '24' }}
      bg="gray.50"
      _dark={{ bg: 'gray.900' }}
    >
      <Container maxW="container.lg">
        <RevealBox>
          <VStack
            spacing={6}
            textAlign="center"
            py={{ base: 12, md: 16 }}
            px={{ base: 6, md: 12 }}
            rounded="2xl"
            bg="white"
            borderWidth="1px"
            borderColor={brand.line}
            _dark={{ bg: 'gray.950', borderColor: 'whiteAlpha.100' }}
            boxShadow="lg"
          >
            <Heading
              as="h2"
              fontSize={{ base: '2xl', md: '3xl' }}
              fontWeight="semibold"
              letterSpacing="-0.02em"
              color={brand.ink}
              _dark={{ color: 'white' }}
            >
              See FollowUp in action
            </Heading>
            <Text
              fontSize="lg"
              color="gray.600"
              _dark={{ color: 'gray.400' }}
              maxW="lg"
            >
              Get a tailored walkthrough and see how automation fits your
              funnel.
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
