'use client'

import { HStack, useColorModeValue } from '@chakra-ui/react'
import { useDisclosure, useUpdateEffect } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'

import * as React from 'react'

import { MobileNavButton } from '#components/mobile-nav'
import { MobileNavContent } from '#components/mobile-nav'
import { NavLink } from '#components/nav-link'
import siteConfig from '#data/config'
import { useScrollSpy } from '#hooks/use-scrollspy'
import { useAuthSession } from '#hooks/use-auth-session'

import ThemeToggle from './theme-toggle'

const SCROLL_SPY_SELECTORS = siteConfig.header.links
  .filter(({ id }) => id)
  .map(({ id }) => `[id="${id}"]`)

const SCROLL_SPY_OPTIONS: IntersectionObserverInit = { threshold: 0.75 }

const Navigation: React.FC = () => {
  const mobileNav = useDisclosure()
  const path = usePathname()
  const activeId = useScrollSpy(SCROLL_SPY_SELECTORS, SCROLL_SPY_OPTIONS)
  const auth = useAuthSession()
  const isUserSignedIn = auth.authenticated && !auth.loading

  const mobileNavBtnRef = React.useRef<HTMLButtonElement>()
  /** Light landing pages use white hero; dark mode tokens made nav links near-invisible. */
  const navMutedColor = useColorModeValue('gray.800', 'whiteAlpha.900')
  const navHoverColor = useColorModeValue('gray.900', 'white')

  const links = React.useMemo(() => {
    return siteConfig.header.links.map((link) => {
      if (link.href === '/login' && isUserSignedIn) {
        return {
          ...link,
          label: 'Profile',
          href: '/profile',
        }
      }
      return link
    })
  }, [isUserSignedIn])

  useUpdateEffect(() => {
    mobileNavBtnRef.current?.focus()
  }, [mobileNav.isOpen])

  return (
    <HStack spacing="2" flexShrink={0}>
      {links.map(({ href, id, variant, label, ...rest }, i) => {
        const isPrimary = variant === 'primary'
        const linkActive = !!(
          (id && activeId === id) ||
          (href && !!path?.match(new RegExp(href)))
        )
        return (
          <NavLink
            display={['none', null, 'block']}
            href={href || `/#${id}`}
            key={i}
            isActive={linkActive}
            variant={variant}
            {...(isPrimary
              ? {}
              : {
                  color: linkActive ? navHoverColor : navMutedColor,
                  _hover: { color: navHoverColor },
                })}
            {...rest}
          >
            {label}
          </NavLink>
        )
      })}

      <ThemeToggle />

      <MobileNavButton
        ref={mobileNavBtnRef}
        aria-label="Open Menu"
        onClick={mobileNav.onOpen}
      />

      <MobileNavContent isOpen={mobileNav.isOpen} onClose={mobileNav.onClose} />
    </HStack>
  )
}

export default Navigation
