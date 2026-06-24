'use client'

import { Icon } from '@iconify/react/dist/iconify.js'
import { ProjectImage } from '@/components/ui/ProjectImage'
import Link from 'next/link'
import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

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

export function HomeStyleProjectGrid({ items, sectionId, squareThumbnails = false }: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  const bottomAnimation = (index: number) => ({
    initial: { y: 50, opacity: 0 },
    animate: inView ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 },
    transition: { duration: 0.8, delay: 0.4 + index * 0.2 },
  })

  if (!items.length) return null

  return (
    <div ref={ref} className="w-full" id={sectionId}>
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-8 w-full">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            className="group flex flex-col gap-6"
            {...bottomAnimation(index)}
          >
            <Link
              href={item.link || '#'}
              target={item.link?.startsWith('http') ? '_blank' : undefined}
              rel={item.link?.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="relative w-full block"
            >
              <ProjectImage
                src={item.image}
                alt={item.title}
                width={squareThumbnails ? 1080 : 625}
                height={squareThumbnails ? 1080 : 410}
                className={`rounded-2xl w-full h-auto max-w-full ${squareThumbnails ? 'aspect-square object-cover' : ''}`}
              />
              <span className="absolute inset-0 bg-black/50 rounded-2xl hidden group-hover:flex">
                <span className="flex justify-end p-5 w-full">
                  <Icon
                    icon="icon-park-solid:circle-right-up"
                    width="50"
                    height="50"
                    style={{ color: '#fbfbfb' }}
                  />
                </span>
              </span>
            </Link>

            <div className="flex flex-col items-start gap-4">
              <Link
                href={item.link || '#'}
                target={item.link?.startsWith('http') ? '_blank' : undefined}
                rel={item.link?.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                <h3 className="group-hover:text-purple_blue text-2xl">{item.title}</h3>
              </Link>
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
              {item.ctaLabel && (
                <Link
                  href={item.link || '#'}
                  target={item.link?.startsWith('http') ? '_blank' : undefined}
                  rel={item.link?.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="text-sm font-medium text-purple_blue hover:underline"
                >
                  {item.ctaLabel} →
                </Link>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
