import type { Metadata } from 'next'

import { MarketingLayout } from '#components/layout'

export const metadata: Metadata = {
  title: 'FollowUp — Never lose a lead again',
  description:
    'FollowUp automatically messages your leads until they convert. Book a demo.',
}

export default function Layout(props: { children: React.ReactNode }) {
  return (
    <MarketingLayout
      announcementProps={{
        title: 'See it live',
        description: 'Book a short demo tailored to your business.',
        href: '/demo',
        action: 'Book a demo',
      }}
    >
      {props.children}
    </MarketingLayout>
  )
}
