'use client'

import { Box } from '@chakra-ui/react'

import { DemoCtaSection } from './demo-cta-section'
import { FeaturesEssentialSection } from './features-essential-section'
import { FooterCtaSection } from './footer-cta-section'
import { HeroSection } from './hero-section'
import { PricingLandingSection } from './pricing-landing-section'
import { ProblemSection } from './problem-section'
import { SolutionSection } from './solution-section'
import { UseCasesSection } from './use-cases-section'

export function LandingHome() {
  return (
    <Box bg="white" _dark={{ bg: 'gray.950' }}>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <UseCasesSection />
      <FeaturesEssentialSection />
      <DemoCtaSection />
      <PricingLandingSection />
      <FooterCtaSection />
    </Box>
  )
}
