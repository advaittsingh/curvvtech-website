'use client'

import { Box, Button, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { QuestionnairePageFields } from '#components/questionnaire-fields'
import { fetchWithAuth } from '#lib/fetch-with-auth'
import { getApiOrigin, parseApiError, v1ApiPath } from '#lib/followup-api'
import {
  initialQuestionnaire,
  pageValid,
  QUESTIONNAIRE_HEADINGS,
  serverBusinessPatchFromQuestionnaire,
  type BusinessQuestionnaire,
} from '#lib/questionnaire-shared'

export function BusinessQuestionnaireForm() {
  const router = useRouter()
  const [page, setPage] = useState(0)
  const [q, setQ] = useState<BusinessQuestionnaire>(() => initialQuestionnaire())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const total = 4
  const canNext = pageValid(page, q)

  const submit = async () => {
    setError(null)
    setLoading(true)
    try {
      const base = getApiOrigin()
      if (!base) {
        setError('App is not configured (NEXT_PUBLIC_API_URL).')
        return
      }
      const res = await fetchWithAuth(v1ApiPath('me/business'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverBusinessPatchFromQuestionnaire(q)),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        setError(parseApiError(data) || 'Could not save')
        return
      }
      router.push('/profile')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box w="full" maxW="lg">
      <Text fontSize="sm" color="gray.400" mb={2}>
        Step {page + 1} of {total}
      </Text>
      <Box h={1} bg="whiteAlpha.100" borderRadius="full" mb={8}>
        <Box
          h="full"
          w={`${((page + 1) / total) * 100}%`}
          bg="purple.400"
          borderRadius="full"
          transition="width 0.2s ease"
        />
      </Box>
      <Text fontSize="2xl" fontWeight="bold" mb={6}>
        {QUESTIONNAIRE_HEADINGS[page as 0 | 1 | 2 | 3]}
      </Text>
      <QuestionnairePageFields page={page} q={q} setQ={setQ} />
      {error ? (
        <Text color="red.400" fontSize="sm" mt={4}>
          {error}
        </Text>
      ) : null}
      <Stack direction="row" justify="space-between" mt={10}>
        <Button
          variant="ghost"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          isDisabled={page === 0}
        >
          Back
        </Button>
        {page < total - 1 ? (
          <Button colorScheme="purple" isDisabled={!canNext} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        ) : (
          <Button colorScheme="purple" isLoading={loading} isDisabled={!canNext} onClick={submit}>
            Finish
          </Button>
        )}
      </Stack>
    </Box>
  )
}
