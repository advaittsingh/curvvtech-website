import type { Metadata } from 'next'

import { MarketingLayout } from '#components/layout'
import { MarketingStructuredData } from '#components/seo/marketing-structured-data'
import { createPageMetadata } from '#lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'FollowUp — Never lose a lead again',
  description:
    'FollowUp automatically messages your leads until they convert. Automate WhatsApp and email follow-ups for your sales team.',
  path: '/',
})

export default function Layout(props: { children: React.ReactNode }) {
  return (
    <>
      <MarketingStructuredData />
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
    </>
  )
}
