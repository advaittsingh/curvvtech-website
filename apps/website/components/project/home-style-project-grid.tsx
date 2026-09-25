import { ProjectImage } from '@/components/ui/ProjectImage'
import Link from 'next/link'

export type HomeStyleProjectItem = {
  id: string
  image: string
  title: string
  description?: string
  tags: string[]
  link: string
  ctaLabel?: string
}

type Props = {
  items: HomeStyleProjectItem[]
  /** e.g. id="work" for anchor links */
  sectionId?: string
  /** Use 1:1 thumbnails (product promo cards) */
  squareThumbnails?: boolean
}

function ArrowOutIcon() {
  return (
    <svg width="50" height="50" viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#fbfbfb" />
      <path
        d="M18 30L30 18M30 18H21M30 18V27"
        stroke="#1B1D1E"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function HomeStyleProjectGrid({ items, sectionId, squareThumbnails = false }: Props) {
  if (!items.length) return null

  return (
    <div className="w-full" id={sectionId}>
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-8 w-full">
        {items.map((item, index) => {
          const hasLink = Boolean(item.link && item.link !== '#')
          const isExternal = Boolean(item.link?.startsWith('http'))
          const linkProps = hasLink
            ? {
                href: item.link,
                target: isExternal ? ('_blank' as const) : undefined,
                rel: isExternal ? 'noopener noreferrer' : undefined,
                prefetch: isExternal ? false : undefined,
              }
            : null

          return (
            <div
              key={item.id}
              className="group flex flex-col gap-6"
            >
              {linkProps ? (
                <Link {...linkProps} className="relative w-full block">
                  <ProjectImage
                    src={item.image}
                    alt={item.title}
                    width={squareThumbnails ? 1080 : 800}
                    height={squareThumbnails ? 1080 : 534}
                    priority={index < 2}
                    className={`rounded-2xl w-full h-auto max-w-full ${squareThumbnails ? 'aspect-square object-cover' : ''}`}
                  />
                  <span className="absolute inset-0 bg-black/50 rounded-2xl hidden group-hover:flex">
                    <span className="flex justify-end p-5 w-full">
                      <ArrowOutIcon />
                    </span>
                  </span>
                </Link>
              ) : (
                <div className="relative w-full">
                  <ProjectImage
                    src={item.image}
                    alt={item.title}
                    width={squareThumbnails ? 1080 : 800}
                    height={squareThumbnails ? 1080 : 534}
                    priority={index < 2}
                    className={`rounded-2xl w-full h-auto max-w-full ${squareThumbnails ? 'aspect-square object-cover' : ''}`}
                  />
                </div>
              )}

              <div className="flex flex-col items-start gap-4">
                {linkProps ? (
                  <Link {...linkProps}>
                    <h3 className="group-hover:text-purple_blue text-2xl">{item.title}</h3>
                  </Link>
                ) : (
                  <h3 className="text-2xl">{item.title}</h3>
                )}
                {item.description && (
                  <p className="text-dark_black/60 dark:text-white/60 text-base leading-relaxed">
                    {item.description}
                  </p>
                )}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {item.tags.map((tag, idx) => (
                      <p
                        key={`${item.id}-tag-${idx}`}
                        className="text-sm border border-dark_black/10 dark:border-white/50 w-fit py-1.5 px-4 rounded-full hover:bg-dark_black hover:text-white"
                      >
                        {tag}
                      </p>
                    ))}
                  </div>
                )}
                {item.ctaLabel && linkProps && (
                  <Link
                    {...linkProps}
                    className="text-sm font-medium text-purple_blue hover:underline"
                  >
                    {item.ctaLabel} →
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
