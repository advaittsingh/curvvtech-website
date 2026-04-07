'use client'

import {
  Box,
  BoxProps,
  Container,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react'
import { usePathname } from 'next/navigation'

import * as React from 'react'

import { Logo } from './logo'
import Navigation from './navigation'

export interface HeaderProps extends Omit<BoxProps, 'children'> {}

export const Header = (props: HeaderProps) => {
  const pathname = usePathname()
  const isHomeHero = pathname === '/'
  const ref = React.useRef<HTMLHeadingElement>(null)
  const [y, setY] = React.useState(0)
  const { height = 0 } = ref.current?.getBoundingClientRect() ?? {}

  React.useEffect(() => {
    const onScroll = () => setY(window.scrollY)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const bg = useColorModeValue('whiteAlpha.700', 'rgba(29, 32, 37, 0.7)')
  const scrolled = y > height
  /** Home: header sits on shared hero gradient — no frosted strip at top. */
  const mergeHomeHeader = isHomeHero && !scrolled

  return (
    <Box
      ref={ref}
      as="header"
      top="0"
      w="full"
      position="fixed"
      backdropFilter={mergeHomeHeader ? 'none' : scrolled ? 'blur(8px)' : 'blur(5px)'}
      zIndex="sticky"
      borderColor="whiteAlpha.100"
      transitionProperty="common"
      transitionDuration="normal"
      bg={scrolled ? bg : 'transparent'}
      boxShadow={scrolled ? 'md' : 'none'}
      borderBottomWidth={scrolled ? '1px' : '0'}
      {...props}
    >
      <Container maxW="container.2xl" px="8" py="4">
        <Flex width="full" align="center" justify="space-between">
          <Logo
            onClick={(e) => {
              if (window.location.pathname === '/') {
                e.preventDefault()

                window.scrollTo({
                  top: 0,
                  behavior: 'smooth',
                })
              }
            }}
          />
          <Navigation />
        </Flex>
      </Container>
    </Box>
  )
}
