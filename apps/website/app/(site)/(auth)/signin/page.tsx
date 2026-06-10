import Signin from '@/components/auth/sign-in'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Sign In | Curvvtech',
}

function SigninFallback() {
  return (
    <section className='min-h-[40vh] flex items-center justify-center'>
      <div className='animate-pulse text-dark_black/50 dark:text-white/50'>
        Loading...
      </div>
    </section>
  )
}

const SigninPage = () => {
  return (
    <Suspense fallback={<SigninFallback />}>
      <Signin />
    </Suspense>
  )
}

export default SigninPage
