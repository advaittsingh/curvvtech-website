'use client'

import { Box, Button, Center, Heading, Spinner, Stack, Text, useToast } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuthSession } from '#hooks/use-auth-session'
import { authHeaders, getApiOrigin, v1ApiPath } from '#lib/followup-api'
import { uploadProfileImage } from '#lib/profile-upload'

type ServerProfile = {
  profile_photo_s3_key: string | null
  id_document_s3_key: string | null
}

export default function ProfileMediaPage() {
  const toast = useToast()
  const session = useAuthSession()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const idInputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<ServerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<'photo' | 'id' | null>(null)

  const load = useCallback(async () => {
    const base = getApiOrigin()
    if (!base) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(v1ApiPath('me/profile'), { headers: authHeaders() })
      if (res.ok) setProfile((await res.json()) as ServerProfile)
    } catch {
      /* */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onPick = async (purpose: 'profile_photo' | 'id_document', file: File | null) => {
    if (!file) return
    setUploading(purpose === 'profile_photo' ? 'photo' : 'id')
    const err = await uploadProfileImage(purpose, file)
    setUploading(null)
    if (err) {
      toast({ title: err, status: 'error' })
      return
    }
    await load()
    void session.refresh()
    toast({ title: purpose === 'profile_photo' ? 'Photo updated' : 'ID uploaded', status: 'success' })
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
        <Heading as="h1" size="lg">
          Photo &amp; government ID
        </Heading>
        <Text color="muted" fontSize="sm">
          JPEG, PNG, or WebP. Same secure upload flow as the mobile app.
        </Text>
      </Stack>

      <Box
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        borderRadius="xl"
        p={{ base: 5, md: 6 }}
        bg="whiteAlpha.50"
      >
        <Stack direction={{ base: 'column', sm: 'row' }} spacing={3}>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              void onPick('profile_photo', f ?? null)
            }}
          />
          <input
            ref={idInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              void onPick('id_document', f ?? null)
            }}
          />
          <Button
            variant="outline"
            isLoading={uploading === 'photo'}
            onClick={() => photoInputRef.current?.click()}
          >
            {profile?.profile_photo_s3_key ? 'Replace profile photo' : 'Upload profile photo'}
          </Button>
          <Button variant="outline" isLoading={uploading === 'id'} onClick={() => idInputRef.current?.click()}>
            {profile?.id_document_s3_key ? 'Replace government ID' : 'Upload government ID'}
          </Button>
        </Stack>
      </Box>
    </Stack>
  )
}
