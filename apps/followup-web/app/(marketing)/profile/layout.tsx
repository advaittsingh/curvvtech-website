import { AccountAreaLayout } from '#components/profile/account-area-layout'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <AccountAreaLayout>{children}</AccountAreaLayout>
}
