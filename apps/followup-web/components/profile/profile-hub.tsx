'use client'

import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Heading,
  Stack,
  Text,
} from '@chakra-ui/react'
import NextLink from 'next/link'

import { PROFILE_SECTION_ITEMS } from '#components/profile/profile-nav-items'

export function ProfileHub() {
  return (
    <Stack spacing={8}>
      <Stack spacing={2}>
        <Heading as="h1" size="lg">
          Profile overview
        </Heading>
        <Text color="muted" fontSize="sm">
          Open a section from the sidebar, or expand a row below for a short summary and a direct link.
        </Text>
      </Stack>

      <Accordion allowMultiple defaultIndex={[]}>
        {PROFILE_SECTION_ITEMS.map((it) => (
          <AccordionItem
            key={it.href}
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            borderRadius="lg"
            mb={3}
            bg="whiteAlpha.50"
            overflow="hidden"
          >
            <AccordionButton py={4} px={4} _expanded={{ bg: 'whiteAlpha.100' }}>
              <Box flex="1" textAlign="left">
                <Text fontWeight="semibold">{it.label}</Text>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4} pt={0} px={4} borderTopWidth="1px" borderColor="whiteAlpha.100">
              <Text fontSize="sm" color="muted" mb={4}>
                {it.description}
              </Text>
              <Button as={NextLink as any} href={it.href} size="sm" colorScheme="purple" w={{ base: 'full', sm: 'auto' }}>
                Open
              </Button>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Stack>
  )
}
