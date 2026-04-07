'use client'

import {
  Box,
  ButtonGroup,
  Container,
  HStack,
  Icon,
  Stack,
  Tag,
  Text,
  VStack,
} from '@chakra-ui/react'
import {
  FiArrowRight,
  FiBarChart2,
  FiBell,
  FiMessageCircle,
  FiShare2,
} from 'react-icons/fi'

import * as React from 'react'

import { ButtonLink } from '#components/button-link/button-link'
import { Faq } from '#components/faq/faq'
import { Features } from '#components/features'
import { Hero } from '#components/hero/hero'
import { Highlights, HighlightsTestimonialItem } from '#components/highlights'
import { ChakraLogo, NextjsLogo } from '#components/logos'
import { FallInPlace } from '#components/motion/fall-in-place'
import { Pricing } from '#components/pricing/pricing'
import { Testimonial, Testimonials } from '#components/testimonials'
import faq from '#data/faq'
import pricing from '#data/pricing'
import testimonials from '#data/testimonials'

/** Original FollowUp marketing layout (gradient, SaaS UI blocks) + new conversion copy. */
export function ClassicMarketingHome() {
  return (
    <Box>
      <HeroSection />
      <BenefitsStrip />
      <HighlightsSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
    </Box>
  )
}

const HeroSection: React.FC = () => {
  return (
    <Box position="relative" zIndex={1} overflow="hidden">
      <Container
        maxW="container.xl"
        pt={{ base: 16, lg: 36 }}
        pb="40"
      >
        <Stack direction={{ base: 'column', lg: 'row' }} alignItems="center">
          <Hero
            id="home"
            justifyContent="flex-start"
            px="0"
            badge={
              <FallInPlace>
                <Tag
                  size="lg"
                  colorScheme="primary"
                  variant="subtle"
                  borderRadius="full"
                >
                  For agencies, local businesses & sales teams
                </Tag>
              </FallInPlace>
            }
            title={
              <FallInPlace delay={0.15}>Never lose a lead again.</FallInPlace>
            }
            description={
              <FallInPlace delay={0.4} fontWeight="medium">
                FollowUp automatically messages your leads until they convert — so
                you close more deals without doing the work. No spreadsheets. No
                busywork.
              </FallInPlace>
            }
          >
            <FallInPlace delay={0.8}>
              <HStack pt="4" pb="12" spacing="8">
                <NextjsLogo height="28px" /> <ChakraLogo height="20px" />
              </HStack>

              <ButtonGroup spacing={4} alignItems="center">
                <ButtonLink colorScheme="primary" size="lg" href="/demo">
                  Book a Demo
                </ButtonLink>
                <ButtonLink
                  size="lg"
                  href="#benefits"
                  variant="outline"
                  rightIcon={
                    <Icon
                      as={FiArrowRight}
                      sx={{
                        transitionProperty: 'common',
                        transitionDuration: 'normal',
                        '.chakra-button:hover &': {
                          transform: 'translate(5px)',
                        },
                      }}
                    />
                  }
                >
                  See How It Works
                </ButtonLink>
              </ButtonGroup>
            </FallInPlace>
          </Hero>
          <Box
            height="600px"
            position="absolute"
            display={{ base: 'none', lg: 'block' }}
            left={{ lg: '60%', xl: '55%' }}
            width="80vw"
            maxW="1100px"
            margin="0 auto"
          >
            <FallInPlace delay={1}>
              <Box overflow="hidden" height="100%" rounded="xl" boxShadow="2xl">
                <HeroProductMock />
              </Box>
            </FallInPlace>
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}

/** In-app style preview when no screenshot asset is shipped. */
function HeroProductMock() {
  return (
    <Box
      h="full"
      minH="480px"
      bg="gray.900"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      p={6}
    >
      <Text fontSize="sm" fontWeight="bold" color="white" mb={4}>
        Live pipeline
      </Text>
      <VStack align="stretch" spacing={3}>
        {['New lead · WhatsApp', 'Reminder sent · Email', 'Reply · Hot'].map(
          (label, i) => (
            <HStack
              key={label}
              justify="space-between"
              py={3}
              px={4}
              rounded="md"
              bg={i === 2 ? 'primary.600' : 'whiteAlpha.100'}
            >
              <Text fontSize="sm" color="white">
                {label}
              </Text>
              <Box
                w={2}
                h={2}
                rounded="full"
                bg={i === 2 ? 'green.300' : 'whiteAlpha.400'}
              />
            </HStack>
          ),
        )}
      </VStack>
    </Box>
  )
}

const BenefitsStrip: React.FC = () => {
  return (
    <Features
      id="benefits"
      columns={[1, 2, 4]}
      iconSize={4}
      innerWidth="container.xl"
      pt="20"
      features={[
        {
          title: 'Automated follow-ups',
          icon: FiMessageCircle,
          description:
            'Sequences across WhatsApp and email keep every lead warm — without retyping the same message.',
          iconPosition: 'left',
          delay: 0.6,
        },
        {
          title: 'Smart reminders',
          icon: FiBell,
          description:
            'Know who needs a nudge before the moment passes — not after.',
          iconPosition: 'left',
          delay: 0.8,
        },
        {
          title: 'Lead tracking',
          icon: FiBarChart2,
          description: 'One clear view from new to won, without spreadsheet chaos.',
          iconPosition: 'left',
          delay: 1,
        },
        {
          title: 'Multi-channel messaging',
          icon: FiShare2,
          description:
            'Meet leads where they already are — WhatsApp, email, and more.',
          iconPosition: 'left',
          delay: 1.1,
        },
      ]}
    />
  )
}

const HighlightsSection: React.FC = () => {
  return (
    <Highlights id="how-it-works" py="20">
      <HighlightsTestimonialItem
        name="Why leads slip away"
        description="The cost of slow follow-up"
        avatar="https://api.dicebear.com/7.x/shapes/svg?seed=leads-slip"
        gradient={['primary.500', 'secondary.500']}
        readableOnLight
      >
        <Stack spacing={4} fontSize="lg">
          <Text>
            Leads go cold when the next message doesn’t go out on time.
          </Text>
          <Text>Manual follow-ups don’t scale when volume picks up.</Text>
          <Text>
            Good deals die in the gap between intent and your next reply.
          </Text>
        </Stack>
      </HighlightsTestimonialItem>
      <HighlightsTestimonialItem
        name="How FollowUp works"
        description="Capture · Automate · Convert"
        avatar="https://api.dicebear.com/7.x/shapes/svg?seed=followup-flow"
        gradient={['primary.500', 'secondary.500']}
        readableOnLight
      >
        <Stack spacing={4} fontSize="lg">
          <Text>
            <Text as="span" fontWeight="bold">
              1.
            </Text>{' '}
            Capture leads from the channels you already use.
          </Text>
          <Text>
            <Text as="span" fontWeight="bold">
              2.
            </Text>{' '}
            Automate follow-ups on WhatsApp and email.
          </Text>
          <Text>
            <Text as="span" fontWeight="bold">
              3.
            </Text>{' '}
            Convert while intent is still high.
          </Text>
        </Stack>
      </HighlightsTestimonialItem>
      <HighlightsTestimonialItem
        name="Teams that live in chats"
        description="Agencies · Cafes · Real estate · Service businesses"
        avatar="https://api.dicebear.com/7.x/shapes/svg?seed=followup"
        gradient={['primary.500', 'secondary.500']}
        readableOnLight
      >
        Whether you sell retainers, lattes, or listings — the rule is the same:
        follow up, or lose the deal. FollowUp runs the follow-up so you can focus
        on closing.
      </HighlightsTestimonialItem>
    </Highlights>
  )
}

const FeaturesSection: React.FC = () => {
  return (
    <Features
      id="features"
      pt="20"
      innerWidth="container.xl"
      title="Everything you need to protect your pipeline"
      description={
        <Text color="muted" fontSize="xl" maxW="container.lg">
          A focused toolkit: automate outreach, stay on top of every lead, and
          keep conversations in one place — without enterprise complexity.
        </Text>
      }
      align="left"
      columns={[1, 2, 3]}
      features={[
        {
          title: 'Automated follow-ups',
          icon: FiMessageCircle,
          description:
            'Personal-feeling sequences without living in your inbox all day.',
        },
        {
          title: 'Smart reminders',
          icon: FiBell,
          description: 'Surface who needs attention before it’s too late.',
        },
        {
          title: 'Lead tracking',
          icon: FiBarChart2,
          description: 'Status from first touch to won, at a glance.',
        },
        {
          title: 'Multi-channel messaging',
          icon: FiShare2,
          description: 'WhatsApp, email, and more — where your buyers already are.',
        },
      ]}
    />
  )
}

const TestimonialsSection: React.FC = () => {
  return (
    <Testimonials
      title={testimonials.title}
      columns={[1, 2, 3]}
      innerWidth="container.xl"
      pt="40"
      mb="40"
    >
      {testimonials.items.map((item, i) => (
        <Testimonial key={i} {...item} />
      ))}
    </Testimonials>
  )
}

const PricingSection: React.FC = () => {
  return (
    <Pricing
      id="pricing"
      title={pricing.title}
      description={pricing.description}
      plans={pricing.plans}
    >
      {null}
    </Pricing>
  )
}

const FaqSection: React.FC = () => {
  return (
    <Faq
      id="faq"
      py="20"
      maxW="container.xl"
      mx="auto"
      title={faq.title}
      items={faq.items}
    />
  )
}
