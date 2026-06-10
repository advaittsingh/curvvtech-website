'use client'

import {
  Box,
  Container,
  Heading,
  HStack,
  Icon,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import Image from 'next/image'
import { FiArrowRight } from 'react-icons/fi'

import { ButtonLink } from '#components/button-link/button-link'

import { brand } from './tokens'
import { RevealBox } from './reveal-box'

export function HeroSection() {
  return (
    <Box
      as="section"
      id="home"
      position="relative"
      overflow="hidden"
      bg="white"
      _dark={{ bg: 'gray.950' }}
      pt={{ base: '28', md: '36' }}
      pb={{ base: '20', md: '28' }}
    >
      <Box
        position="absolute"
        inset={0}
        bgGradient="radial(circle at 70% 20%, rgba(201, 162, 39, 0.12), transparent 45%)"
        pointerEvents="none"
        _dark={{
          bgGradient:
            'radial(circle at 70% 20%, rgba(201, 162, 39, 0.18), transparent 45%)',
        }}
      />
      <Container maxW="container.xl" position="relative">
        <Stack
          direction={{ base: 'column', lg: 'row' }}
          spacing={{ base: 12, lg: 16 }}
          align="center"
        >
          <VStack align="stretch" spacing={8} flex="1" maxW={{ lg: 'xl' }}>
            <RevealBox>
              <Heading
                as="h1"
                fontSize={{ base: '4xl', sm: '5xl', lg: '6xl' }}
                fontWeight="semibold"
                letterSpacing="-0.03em"
                lineHeight="1.05"
                color={brand.ink}
                _dark={{ color: 'white' }}
              >
                Never lose a lead again.
              </Heading>
            </RevealBox>
            <RevealBox delay={0.08}>
              <Text
                fontSize={{ base: 'lg', md: 'xl' }}
                color="gray.600"
                _dark={{ color: 'gray.400' }}
                lineHeight="tall"
                maxW="2xl"
              >
                FollowUp automatically messages your leads until they convert —
                so you close more deals without doing the work.
              </Text>
            </RevealBox>
            <RevealBox delay={0.14}>
              <HStack spacing={4} flexWrap="wrap">
                <ButtonLink
                  href="/demo"
                  size="lg"
                  rounded="full"
                  px={8}
                  bg={brand.gold}
                  color={brand.ink}
                  _hover={{ bg: brand.goldHover, color: brand.ink }}
                  _active={{ bg: brand.goldHover }}
                  fontWeight="semibold"
                  boxShadow="sm"
                >
                  Book a Demo
                </ButtonLink>
                <ButtonLink
                  href="/#how-it-works"
                  size="lg"
                  variant="outline"
                  rounded="full"
                  px={8}
                  borderColor={brand.ink}
                  color={brand.ink}
                  _dark={{
                    borderColor: 'whiteAlpha.800',
                    color: 'white',
                  }}
                  _hover={{
                    bg: 'blackAlpha.50',
                    _dark: { bg: 'whiteAlpha.100' },
                  }}
                  fontWeight="medium"
                  rightIcon={
                    <Icon
                      as={FiArrowRight}
                      sx={{
                        transition: 'transform 0.2s ease',
                        '.chakra-button:hover &': { transform: 'translateX(4px)' },
                      }}
                    />
                  }
                >
                  See How It Works
                </ButtonLink>
              </HStack>
            </RevealBox>
          </VStack>

          <RevealBox delay={0.2} flex="1" w="full" maxW={{ lg: '480px' }} mx={{ base: 'auto', lg: 0 }}>
            <Box
              position="relative"
              rounded="2xl"
              overflow="hidden"
              borderWidth="1px"
              borderColor={brand.line}
              _dark={{ borderColor: 'whiteAlpha.200' }}
              boxShadow="xl"
              lineHeight={0}
            >
              <Image
                src="/static/images/hero-followup.png"
                alt="FollowUp app on mobile — business summary, leads, and insights"
                width={1724}
                height={2316}
                sizes="(max-width: 1024px) min(100vw - 48px, 520px), 480px"
                quality={95}
                priority
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </Box>
          </RevealBox>
        </Stack>
      </Container>
    </Box>
  )
}
