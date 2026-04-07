import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book a demo — FollowUp',
  description:
    'Schedule a walkthrough of FollowUp and see automated follow-ups for your team.',
}

export default function DemoLayout(props: { children: React.ReactNode }) {
  return props.children
}
