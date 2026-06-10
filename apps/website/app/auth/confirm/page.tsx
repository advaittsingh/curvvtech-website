import { Suspense } from 'react'
import AuthConfirmClient from './AuthConfirmClient'

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-dark_black/60 dark:text-white/60">Redirecting...</p>
        </div>
      }>
      <AuthConfirmClient />
    </Suspense>
  )
}
