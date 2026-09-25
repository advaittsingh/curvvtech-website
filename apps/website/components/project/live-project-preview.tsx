'use client'

import { ProjectImage } from '@/components/ui/ProjectImage'

const BLOCKED_PREVIEW_HOSTS = new Set([
  'masakoindia.com',
  'www.masakoindia.com',
])

function canEmbed(url?: string): boolean {
  if (!url || url === '#') return false
  try {
    const parsed = new URL(url)
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      !BLOCKED_PREVIEW_HOSTS.has(parsed.hostname.toLowerCase())
    )
  } catch {
    return false
  }
}

type Props = {
  image: string
  previewUrl?: string
  title: string
  square?: boolean
}

export function LiveProjectPreview({ image, previewUrl, title, square = false }: Props) {
  const showLivePreview = canEmbed(previewUrl)

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-neutral-100 ${
        square ? 'aspect-square' : 'aspect-[625/410]'
      }`}
    >
      <ProjectImage
        src={image}
        alt={title}
        fill
        className="object-cover"
      />
      {showLivePreview && (
        <>
          <iframe
            src={previewUrl}
            title={`${title} live website preview`}
            loading="lazy"
            tabIndex={-1}
            aria-hidden="true"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin"
            className="pointer-events-none absolute inset-0 h-full w-full border-0 bg-white"
          />
          <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white backdrop-blur">
            Live preview
          </span>
        </>
      )}
    </div>
  )
}
