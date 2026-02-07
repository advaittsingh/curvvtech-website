import { Configuration } from '@/app/components/documentation/Configuration'
import { DocNavigation } from '@/app/components/documentation/DocNavigation'
import { Introduction } from '@/app/components/documentation/Introduction'
import { PackageStructure } from '@/app/components/documentation/PackageStructure'
import { QuickStart } from '@/app/components/documentation/QuickStart'
import { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Documentation | Curvvtech',
}

export default function Page() {
  return (
    <div className='dark:bg-darkmode pt-2'>
      <div className='container p-6 lg:mt-16 mt-16 pt-10!'>
        <div className='grid grid-cols-12 gap-6'>
          <div className='lg:col-span-3 col-span-12 lg:block hidden'>
            <DocNavigation />
          </div>
          <div className='lg:col-span-9 col-span-12'>
            <Introduction />
            <PackageStructure />
            <QuickStart />
            <Configuration />
          </div>
        </div>
      </div>
    </div>
  )
}
