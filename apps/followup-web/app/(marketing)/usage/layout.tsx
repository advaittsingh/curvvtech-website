import type { Metadata } from 'next'

import { AccountAreaLayout } from '#components/profile/account-area-layout'
import { NOINDEX_ROBOTS } from '#lib/seo'

export const metadata: Metadata = {
  robots: NOINDEX_ROBOTS,
}

export default function UsageLayout({ children }: { children: React.ReactNode }) {
  return <AccountAreaLayout>{children}</AccountAreaLayout>
}
