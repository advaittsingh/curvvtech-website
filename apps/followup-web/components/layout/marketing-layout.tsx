'use client'

import { Box, SkipNavContent, SkipNavLink } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'

import { ReactNode } from 'react'

import {
  AnnouncementBanner,
  AnnouncementBannerProps,
} from '../announcement-banner'
import { BackgroundGradient } from '../gradients/background-gradient'
import { Footer, FooterProps } from './footer'
import { Header, HeaderProps } from './header'

interface LayoutProps {
  children: ReactNode
  announcementProps?: AnnouncementBannerProps
  headerProps?: HeaderProps
  footerProps?: FooterProps
}

export const MarketingLayout: React.FC<LayoutProps> = (props) => {
  const { children, announcementProps, headerProps, footerProps } = props
  const pathname = usePathname()
  const isDemoPage =
    pathname === '/demo' || (pathname?.startsWith('/demo/') ?? false)
  /** Floating gold-outline demo strip: homepage only (not onboarding, pricing, etc.). */
  const isHomePage = pathname === '/'

  return (
    <Box position="relative">
      {isHomePage && !isDemoPage ? (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          h="100vh"
          zIndex={0}
          pointerEvents="none"
          overflow="hidden"
          aria-hidden
        >
          <BackgroundGradient height="100%" zIndex="-1" />
        </Box>
      ) : null}
      <SkipNavLink>Skip to content</SkipNavLink>
      {announcementProps && !isDemoPage && isHomePage ? (
        <AnnouncementBanner {...announcementProps} />
      ) : null}
      <Header {...headerProps} />
      <Box as="main" position="relative" zIndex={1} pt="24">
        <SkipNavContent />
        {children}
      </Box>
      <Footer {...footerProps} />
    </Box>
  )
}
