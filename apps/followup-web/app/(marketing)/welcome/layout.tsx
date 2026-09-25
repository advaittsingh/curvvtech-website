import type { Metadata } from 'next'

import { createPageMetadata } from '#lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: "You're in — FollowUp",
  description: "We're launching soon. You're on the FollowUp waitlist.",
  path: '/welcome',
  noIndex: true,
})

export default function WelcomeLayout(props: { children: React.ReactNode }) {
  return props.children
}
