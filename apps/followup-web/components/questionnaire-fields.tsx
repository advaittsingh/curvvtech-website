'use client'

import { Box, Button, Stack, Text, Textarea, VStack } from '@chakra-ui/react'
import type { Dispatch, SetStateAction } from 'react'

import {
  type BusinessQuestionnaire,
  PAGE1_SOURCES,
  PAGE1_TYPE,
  PAGE2_AFTER,
  PAGE2_CONV_LENGTH,
  PAGE3_CHALLENGE,
  PAGE3_FOLLOWUP,
  PAGE3_TRACK,
  PAGE4_PRIORITIES,
  PAGE4_VOLUME,
} from '#lib/questionnaire-shared'

function SelectRow({
  label,
  selected,
  onClick,
  multi,
}: {
  label: string
  selected: boolean
  onClick: () => void
  multi?: boolean
}) {
  return (
    <Button
      type="button"
      variant={selected ? 'solid' : 'outline'}
      colorScheme={selected ? 'purple' : 'gray'}
      justifyContent="flex-start"
      h="auto"
      py={3}
      px={4}
      whiteSpace="normal"
      textAlign="left"
      onClick={onClick}
      leftIcon={
        <Box
          w={multi ? 3 : 4}
          h={multi ? 3 : 4}
          borderRadius={multi ? 'sm' : 'full'}
          borderWidth={2}
          borderColor={selected ? 'white' : 'gray.500'}
          bg={selected ? 'whiteAlpha.300' : 'transparent'}
        />
      }
    >
      {label}
    </Button>
  )
}

export function QuestionnairePageFields({
  page,
  q,
  setQ,
}: {
  page: number
  q: BusinessQuestionnaire
  setQ: Dispatch<SetStateAction<BusinessQuestionnaire>>
}) {
  if (page === 0) {
    return (
      <VStack align="stretch" spacing={4}>
        <Text fontWeight="semibold">What best describes your business?</Text>
        <Stack spacing={2}>
          {PAGE1_TYPE.map((opt) => (
            <SelectRow
              key={opt.id}
              label={opt.label}
              selected={q.businessType === opt.id}
              onClick={() => setQ((s) => ({ ...s, businessType: opt.id }))}
            />
          ))}
        </Stack>
        <Text fontWeight="semibold" pt={2}>
          What do you primarily sell or offer?
        </Text>
        <Textarea
          value={q.primaryOffer}
          onChange={(e) => setQ((s) => ({ ...s, primaryOffer: e.target.value }))}
          placeholder="Cars, digital marketing services, home decor…"
          rows={4}
        />
        <Text fontWeight="semibold" pt={2}>
          Where do most of your customers come from?
        </Text>
        <Text fontSize="sm" color="gray.400">
          Select all that apply
        </Text>
        <Stack spacing={2}>
          {PAGE1_SOURCES.map((opt) => {
            const on = q.customerSources.includes(opt.id)
            return (
              <SelectRow
                key={opt.id}
                label={opt.label}
                selected={on}
                multi
                onClick={() =>
                  setQ((s) => ({
                    ...s,
                    customerSources: on
                      ? s.customerSources.filter((id) => id !== opt.id)
                      : [...s.customerSources, opt.id],
                  }))
                }
              />
            )
          })}
        </Stack>
      </VStack>
    )
  }

  if (page === 1) {
    return (
      <VStack align="stretch" spacing={4}>
        <Text fontWeight="semibold">What do customers usually ask you first?</Text>
        <Textarea
          value={q.customersAskFirst}
          onChange={(e) => setQ((s) => ({ ...s, customersAskFirst: e.target.value }))}
          placeholder="Price, availability, details…"
          rows={4}
        />
        <Text fontWeight="semibold" pt={2}>
          How do conversations usually go?
        </Text>
        <Stack spacing={2}>
          {PAGE2_CONV_LENGTH.map((opt) => (
            <SelectRow
              key={opt.id}
              label={opt.label}
              selected={q.conversationLength === opt.id}
              onClick={() => setQ((s) => ({ ...s, conversationLength: opt.id }))}
            />
          ))}
        </Stack>
        <Text fontWeight="semibold" pt={2}>
          What usually happens after a conversation?
        </Text>
        <Stack spacing={2}>
          {PAGE2_AFTER.map((opt) => (
            <SelectRow
              key={opt.id}
              label={opt.label}
              selected={q.afterConversation === opt.id}
              onClick={() => setQ((s) => ({ ...s, afterConversation: opt.id }))}
            />
          ))}
        </Stack>
      </VStack>
    )
  }

  if (page === 2) {
    return (
      <VStack align="stretch" spacing={4}>
        <Text fontWeight="semibold">How do you currently track leads?</Text>
        <Text fontSize="sm" color="gray.400">
          Select all that apply
        </Text>
        <Stack spacing={2}>
          {PAGE3_TRACK.map((opt) => {
            const on = q.leadTracking.includes(opt.id)
            return (
              <SelectRow
                key={opt.id}
                label={opt.label}
                selected={on}
                multi
                onClick={() =>
                  setQ((s) => ({
                    ...s,
                    leadTracking: on
                      ? s.leadTracking.filter((id) => id !== opt.id)
                      : [...s.leadTracking, opt.id],
                  }))
                }
              />
            )
          })}
        </Stack>
        <Text fontWeight="semibold" pt={2}>
          What&apos;s your biggest challenge?
        </Text>
        <Stack spacing={2}>
          {PAGE3_CHALLENGE.map((opt) => (
            <SelectRow
              key={opt.id}
              label={opt.label}
              selected={q.biggestChallenge === opt.id}
              onClick={() => setQ((s) => ({ ...s, biggestChallenge: opt.id }))}
            />
          ))}
        </Stack>
        <Text fontWeight="semibold" pt={2}>
          How often do you follow up?
        </Text>
        <Stack spacing={2}>
          {PAGE3_FOLLOWUP.map((opt) => (
            <SelectRow
              key={opt.id}
              label={opt.label}
              selected={q.followUpFrequency === opt.id}
              onClick={() => setQ((s) => ({ ...s, followUpFrequency: opt.id }))}
            />
          ))}
        </Stack>
      </VStack>
    )
  }

  return (
    <VStack align="stretch" spacing={4}>
      <Text fontWeight="semibold">What matters most to you?</Text>
      <Text fontSize="sm" color="gray.400">
        Select all that apply
      </Text>
      <Stack spacing={2}>
        {PAGE4_PRIORITIES.map((opt) => {
          const on = q.priorities.includes(opt.id)
          return (
            <SelectRow
              key={opt.id}
              label={opt.label}
              selected={on}
              multi
              onClick={() =>
                setQ((s) => ({
                  ...s,
                  priorities: on
                    ? s.priorities.filter((id) => id !== opt.id)
                    : [...s.priorities, opt.id],
                }))
              }
            />
          )
        })}
      </Stack>
      <Text fontWeight="semibold" pt={2}>
        How many customers do you handle daily?
      </Text>
      <Stack spacing={2}>
        {PAGE4_VOLUME.map((opt) => (
          <SelectRow
            key={opt.id}
            label={opt.label}
            selected={q.dailyCustomerVolume === opt.id}
            onClick={() => setQ((s) => ({ ...s, dailyCustomerVolume: opt.id }))}
          />
        ))}
      </Stack>
      <Text fontWeight="semibold" pt={2}>
        What would success look like for you?
      </Text>
      <Textarea
        value={q.successVision}
        onChange={(e) => setQ((s) => ({ ...s, successVision: e.target.value }))}
        placeholder="Better conversions, less stress, more organized…"
        rows={4}
      />
    </VStack>
  )
}
