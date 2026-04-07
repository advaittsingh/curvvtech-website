'use client'

import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  Center,
  Spinner,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { QuestionnairePageFields } from '#components/questionnaire-fields'
import { useAuthSession } from '#hooks/use-auth-session'
import { authHeaders, getApiOrigin, parseApiError, v1ApiPath } from '#lib/followup-api'
import {
  initialQuestionnaire,
  pageValid,
  QUESTIONNAIRE_HEADINGS,
  questionnaireFromServer,
  serverBusinessPatchFromQuestionnaire,
  type BusinessQuestionnaire,
} from '#lib/questionnaire-shared'

export default function ProfileBusinessPage() {
  const toast = useToast()
  const session = useAuthSession()
  const [q, setQ] = useState<BusinessQuestionnaire>(() => initialQuestionnaire())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)

  const load = useCallback(async () => {
    const base = getApiOrigin()
    if (!base) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(v1ApiPath('me/business'), { headers: authHeaders() })
      if (res.ok) {
        const b = (await res.json()) as { questionnaire?: BusinessQuestionnaire | null }
        setQ(questionnaireFromServer(b))
      }
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const completion = useMemo(() => {
    const sections = [0, 1, 2, 3].map((i) => pageValid(i, q))
    return { sections }
  }, [q])

  const saveSection = async (pageIndex: number) => {
    if (!pageValid(pageIndex, q)) {
      toast({
        title: 'Incomplete section',
        description: 'Fill every field in this section before saving.',
        status: 'warning',
      })
      return
    }
    const base = getApiOrigin()
    if (!base) return
    setSaving(pageIndex)
    try {
      const res = await fetch(v1ApiPath('me/business'), {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(serverBusinessPatchFromQuestionnaire(q)),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        toast({ title: parseApiError(data), status: 'error' })
        return
      }
      void session.refresh()
      toast({ title: 'Business profile saved', status: 'success' })
    } catch {
      toast({ title: 'Network error', status: 'error' })
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <Center minH="40vh">
        <Spinner size="lg" color="purple.400" />
      </Center>
    )
  }

  return (
    <Stack spacing={6}>
      <Stack spacing={2}>
        <Text as="h1" fontSize="2xl" fontWeight="bold">
          Business questionnaire
        </Text>
        <Text color="muted" fontSize="sm">
          Open a section, update answers, then save. Matches the mobile app&apos;s edit flow.
        </Text>
      </Stack>

      <Accordion allowMultiple defaultIndex={[0]}>
        {([0, 1, 2, 3] as const).map((pageIndex) => (
          <AccordionItem key={pageIndex} border="1px solid" borderColor="whiteAlpha.200" borderRadius="lg" mb={3} bg="whiteAlpha.50">
            <h2>
              <AccordionButton py={4} borderRadius="lg">
                <Stack direction="row" flex="1" justify="space-between" align="center" textAlign="left">
                  <Text fontWeight="semibold">{QUESTIONNAIRE_HEADINGS[pageIndex]}</Text>
                  <Stack direction="row" align="center" spacing={2}>
                    <Badge colorScheme={completion.sections[pageIndex] ? 'green' : 'orange'}>
                      {completion.sections[pageIndex] ? 'Complete' : 'Incomplete'}
                    </Badge>
                    <AccordionIcon />
                  </Stack>
                </Stack>
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4} pt={0} px={4}>
              <QuestionnairePageFields page={pageIndex} q={q} setQ={setQ} />
              <Button
                mt={6}
                colorScheme="purple"
                isLoading={saving === pageIndex}
                onClick={() => void saveSection(pageIndex)}
              >
                Save this section
              </Button>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Stack>
  )
}
