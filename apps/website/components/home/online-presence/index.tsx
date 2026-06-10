'use client'
import { Icon } from '@iconify/react/dist/iconify.js'
import { ProjectImage } from '@/components/ui/ProjectImage'
import Link from 'next/link'
import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { TextGenerateEffect } from '@/components/ui/text-generate-effect'
import { onlinePresenceList } from '@/lib/site-page-data'

// Show only these 4 projects in order on the home section
const FEATURED_PROJECT_TITLES = ['PAATA.AI', 'MASAKO INDIA', 'BLAAZE', 'TRACKHAUZ']

function OnlinePresence() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  const featuredList = onlinePresenceList
    ? FEATURED_PROJECT_TITLES.map((title) => onlinePresenceList.find((p: any) => p.title === title)).filter(Boolean)
    : null

  const bottomAnimation = (index: number) => ({
    initial: { y: 50, opacity: 0 },
    animate: inView ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 },
    transition: { duration: 0.8, delay: 0.4 + index * 0.2, },
  })

  return (
    <section id='work'>
      <div ref={ref} className='2xl:py-20 py-11'>
        <div className='container'>
          <div className='flex flex-col justify-center items-center gap-10 md:gap-20'>
            <div className='max-w-2xl text-center'>
              <h2>
                <TextGenerateEffect words="How we transformed a small business’s" duration={0.5} />
                <TextGenerateEffect
                  words="online presence"
                  delay={1.2}
                  className="italic font-normal instrument-font"
                />
              </h2>
            </div>
            <div className='grid md:grid-cols-2 gap-x-6 gap-y-8 w-full'>
              {featuredList?.map((items: any, index: number) => (
                <motion.div
                  key={items.title}
                  className='group flex flex-col gap-6 cursor-pointer'
                  {...bottomAnimation(index)}
                >
                  <div className='relative'>
                    <ProjectImage
                      src={items.image}
                      alt={items.title}
                      width={625}
                      height={410}
                      className='rounded-2xl'
                    />
                    <Link
                      href={items.link || '#'}
                      target={items.link?.startsWith('http') ? '_blank' : undefined}
                      rel={items.link?.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className='absolute top-0 left-0 bg-black/50 w-full h-full rounded-2xl hidden group-hover:flex'
                    >
                      <span className='flex justify-end p-5 w-full'>
                        <Icon
                          icon='icon-park-solid:circle-right-up'
                          width='50'
                          height='50'
                          style={{ color: '#fbfbfb' }}
                        />
                      </span>
                    </Link>
                  </div>

                  <div className='flex flex-col items-start gap-4'>
                    <h3 className='group-hover:text-purple_blue text-2xl'>
                      {items.title}
                    </h3>
                    <div className='flex gap-3'>
                      {items.tag?.map((tag: any, idx: number) => (
                        <p
                          key={idx}
                          className='text-sm border border-dark_black/10 dark:border-white/50 w-fit py-1.5 px-4 rounded-full hover:bg-dark_black hover:text-white'
                        >
                          {tag}
                        </p>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className='flex justify-center mt-10'>
              <Link
                href='/work'
                data-chat-overlap-trigger
                className='group w-fit text-white dark:text-dark_black font-medium bg-dark_black dark:bg-white rounded-full flex items-center gap-4 py-2 pl-5 pr-2 transition-all duration-200 ease-in-out hover:bg-transparent border hover:text-dark_black dark:hover:text-white border-dark_black dark:border-white'
              >
                <span className='transform transition-transform duration-200 ease-in-out group-hover:translate-x-9'>
                  View more
                </span>
                <svg
                  width='32'
                  height='32'
                  viewBox='0 0 32 32'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  className='transform transition-transform duration-200 ease-in-out group-hover:-translate-x-36 group-hover:rotate-45'
                >
                  <rect
                    width='32'
                    height='32'
                    rx='16'
                    className='fill-white dark:fill-black transition-colors duration-200 ease-in-out group-hover:fill-black dark:group-hover:fill-white'
                  />
                  <path
                    d='M11.832 11.3334H20.1654M20.1654 11.3334V19.6668M20.1654 11.3334L11.832 19.6668'
                    stroke='#1B1D1E'
                    strokeWidth='1.42857'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className='stroke-[#1B1D1E] dark:stroke-white transition-colors duration-200 ease-in-out group-hover:stroke-white dark:group-hover:stroke-black'
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default OnlinePresence
