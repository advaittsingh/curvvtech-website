'use client'

import {
  Box,
  Container,
  Heading,
  List,
  ListIcon,
  ListItem,
  Text,
  VStack,
} from '@chakra-ui/react'
import { FiCheck } from 'react-icons/fi'

import { ButtonLink } from '#components/button-link/button-link'

import { brand } from './tokens'
import { RevealBox } from './reveal-box'

const tiers = [
  {
    name: 'Free',
    blurb: 'Try the essentials',
    items: ['Limited leads', 'Basic follow-ups'],
    cta: 'Book a Demo',
    featured: false,
  },
  {
    name: 'Pro Plan',
    blurb: 'For teams scaling outreach',
    items: ['Unlimited leads', 'Automation', 'Analytics'],
    cta: 'Book a Demo',
    featured: true,
  },
  {
    name: 'Pro+ Plan',
    blurb: 'Security & custom fit',
    items: ['Custom workflows', 'API access'],
    cta: 'Book a Demo',
    featured: false,
  },
] as const

export function PricingLandingSection() {
  return (
    <Box
      as="section"
      id="pricing"
      py={{ base: '20', md: '28' }}
      bg="white"
      _dark={{ bg: 'gray.950' }}
    >
      <Container maxW="container.xl">
        <RevealBox textAlign="center" maxW="2xl" mx="auto" mb={4}>
          <Heading
            as="h2"
            fontSize={{ base: '3xl', md: '4xl' }}
            fontWeight="semibold"
            letterSpacing="-0.02em"
            color={brand.ink}
            _dark={{ color: 'white' }}
            mb={4}
          >
            Simple plans. Serious outcomes.
          </Heading>
          <Text fontSize="lg" color="gray.600" _dark={{ color: 'gray.400' }}>
            Book a demo for volume pricing and the right tier for your team.
          </Text>
        </RevealBox>
        <RevealBox delay={0.08}>
          <Box textAlign="center" mb={12}>
            <ButtonLink
              href="/demo"
              variant="link"
              color={brand.gold}
              fontWeight="semibold"
              _hover={{ textDecoration: 'none', color: brand.goldHover }}
            >
              Book a demo for custom pricing →
            </ButtonLink>
          </Box>
        </RevealBox>
        <Box
          display="grid"
          gridTemplateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
          gap={8}
        >
          {tiers.map((tier, i) => (
            <RevealBox key={tier.name} delay={0.08 * i}>
              <VStack
                align="stretch"
                spacing={6}
                p={8}
                rounded="xl"
                h="full"
                borderWidth="2px"
                borderColor={tier.featured ? brand.gold : brand.line}
                bg={tier.featured ? 'blackAlpha.50' : 'transparent'}
                _dark={{
                  borderColor: tier.featured ? brand.gold : 'whiteAlpha.100',
                  bg: tier.featured ? 'whiteAlpha.50' : 'transparent',
                }}
                position="relative"
                overflow="hidden"
              >
                {tier.featured ? (
                  <Text
                    position="absolute"
                    top={4}
                    right={4}
                    fontSize="xs"
                    fontWeight="bold"
                    textTransform="uppercase"
                    letterSpacing="0.06em"
                    color={brand.gold}
                  >
                    Popular
                  </Text>
                ) : null}
                <VStack align="flex-start" spacing={1}>
                  <Heading as="h3" size="md">
                    {tier.name}
                  </Heading>
                  <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                    {tier.blurb}
                  </Text>
                </VStack>
                <List spacing={3}>
                  {tier.items.map((line) => (
                    <ListItem key={line} display="flex" alignItems="flex-start">
                      <ListIcon
                        as={FiCheck}
                        color={brand.gold}
                        mt={1}
                        flexShrink={0}
                      />
                      <Text>{line}</Text>
                    </ListItem>
                  ))}
                </List>
                <ButtonLink
                  href="/demo"
                  mt="auto"
                  rounded="full"
                  variant={tier.featured ? 'solid' : 'outline'}
                  bg={tier.featured ? brand.gold : undefined}
                  color={tier.featured ? brand.ink : undefined}
                  borderColor={tier.featured ? undefined : brand.ink}
                  _dark={{
                    borderColor: tier.featured ? undefined : 'whiteAlpha.800',
                    color: tier.featured ? brand.ink : 'white',
                  }}
                  _hover={{
                    bg: tier.featured ? brand.goldHover : 'blackAlpha.50',
                    _dark: {
                      bg: tier.featured ? brand.goldHover : 'whiteAlpha.100',
                    },
                  }}
                  fontWeight="semibold"
                >
                  {tier.cta}
                </ButtonLink>
              </VStack>
            </RevealBox>
          ))}
        </Box>
      </Container>
    </Box>
  )
}
