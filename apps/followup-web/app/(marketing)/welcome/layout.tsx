import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "You're in — FOLLOWUP",
  description: "We're launching soon.",
}

export default function WelcomeLayout(props: { children: React.ReactNode }) {
  return props.children
}
