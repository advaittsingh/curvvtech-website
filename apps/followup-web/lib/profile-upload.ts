import { authHeaders, getApiOrigin, parseApiError } from '#lib/followup-api'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export function isAllowedImageType(ct: string): ct is (typeof ALLOWED_TYPES)[number] {
  return (ALLOWED_TYPES as readonly string[]).includes(ct)
}

/** Presign + PUT to S3 + PATCH profile with returned key. Returns error message or null on success. */
export async function uploadProfileImage(
  purpose: 'profile_photo' | 'id_document',
  file: File
): Promise<string | null> {
  const base = getApiOrigin()
  if (!base) return 'App is not configured (NEXT_PUBLIC_API_URL).'
  const contentType = file.type || 'image/jpeg'
  if (!isAllowedImageType(contentType)) {
    return 'Use JPEG, PNG, or WebP.'
  }

  const presign = await fetch(`${base}/api/v1/me/profile/upload-url`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ purpose, content_type: contentType }),
  })
  const presignData = (await presign.json()) as Record<string, unknown>
  if (!presign.ok) {
    if (presignData.code === 'S3_NOT_CONFIGURED') {
      return 'Photo upload is not available on this server yet.'
    }
    return parseApiError(presignData) || 'Could not start upload.'
  }

  const url = presignData.url as string | undefined
  const key = presignData.key as string | undefined
  if (!url || !key) return 'Invalid upload response.'

  const put = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': contentType },
  })
  if (!put.ok) return 'Upload failed. Try again.'

  const patchField = purpose === 'profile_photo' ? 'profile_photo_s3_key' : 'id_document_s3_key'
  const extra =
    purpose === 'id_document'
      ? { id_document_s3_key: key, id_verification_status: 'pending' }
      : { profile_photo_s3_key: key }

  const patch = await fetch(`${base}/api/v1/me/profile`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(extra),
  })
  const patchData = (await patch.json()) as Record<string, unknown>
  if (!patch.ok) return parseApiError(patchData) || 'Could not save profile.'

  return null
}
