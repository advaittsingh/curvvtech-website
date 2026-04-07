'use client'

import { Box, Flex } from '@chakra-ui/react'

import { ProfileSidebar } from '#components/profile/profile-sidebar'

export function ProfileShell({ children }: { children: React.ReactNode }) {
  return (
    <Flex
      maxW="6xl"
      mx="auto"
      px={{ base: 4, md: 6 }}
      py={{ base: 6, md: 10 }}
      pb={{ base: 16, md: 24 }}
      gap={{ base: 0, lg: 10 }}
      align="flex-start"
      direction={{ base: 'column', lg: 'row' }}
    >
      <ProfileSidebar />
      <Box flex="1" minW={0}>
        {children}
      </Box>
    </Flex>
  )
}
