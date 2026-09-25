import type { Metadata } from 'next'

import { createPageMetadata } from '#lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'Book a demo — FollowUp',
  description:
    'Schedule a walkthrough of FollowUp and see automated follow-ups for your team.',
  path: '/demo',
})

export default function DemoLayout(props: { children: React.ReactNode }) {
  return props.children
}
