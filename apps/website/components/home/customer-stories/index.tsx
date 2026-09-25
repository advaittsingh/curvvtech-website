"use client"
import Image from 'next/image'
import { TextGenerateEffect } from '@/components/ui/text-generate-effect'
import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

function CustomerStories() {
  // Refs for each box
  const topLeftRef = useRef(null)
  const topRightRef = useRef(null)
  const bottomLeftRef = useRef(null)
  const bottomRightRef = useRef(null)

  // Detect if each box is in view
  const topLeftInView = useInView(topLeftRef, { once: true })
  const topRightInView = useInView(topRightRef, { once: true })
  const bottomLeftInView = useInView(bottomLeftRef, { once: true })
  const bottomRightInView = useInView(bottomRightRef, { once: true })

  return (
    <section>
      <div className="2xl:py-20 py-11">
        <div className="container">
          <div className="flex flex-col justify-center gap-10 md:gap-20">
            <div className="mx-auto max-w-2xl flex items-center text-center">
              <h2>
                <TextGenerateEffect words="What our satisfied customers are saying" />
                <TextGenerateEffect
                  words="about us"
                  delay={0.2}
                  className="italic font-normal instrument-font"
                />
              </h2>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col xl:flex xl:flex-row gap-6">
                {/* Top Left Box */}
                <motion.div
                  ref={topLeftRef}
                  initial={{ x: -100, y: -100, opacity: 0 }}
                  animate={topLeftInView ? { x: 0, y: 0, opacity: 1 } : {}}
                  transition={{ duration: 0.35 }}
                  className="relative overflow-hidden p-8 gap-64 rounded-2xl flex flex-col min-h-[320px] h-full w-full bg-[url('/images/home/customerStories/nivan-testimonial-bg.png')] bg-cover bg-center bg-no-repeat"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" aria-hidden />
                  <span className="relative z-10 text-white/60 uppercase text-sm font-medium">
                    Customer stories
                  </span>
                  <div className="relative z-10 flex flex-col gap-6 mt-auto">
                    <h3 className="text-white">
                      “Curvvtech built a platform that feels like the work we do — calm, dignified, and ready for the families we serve.”
                    </h3>
                    <div className="flex flex-col gap-1">
                      <p className="text-white font-medium">Maj Vantesh Bakshi (Retd.)</p>
                      <p className="text-white/60 text-sm font-medium">
                        Founder & Chairman, NiVan Foundation
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Top Right Box */}
                <motion.div
                  ref={topRightRef}
                  initial={{ x: 100, y: -100, opacity: 0 }}
                  animate={topRightInView ? { x: 0, y: 0, opacity: 1 } : {}}
                  transition={{ duration: 0.35 }}
                  className="flex flex-col justify-between gap-36 xl:max-w-25 bg-pale-yellow rounded-2xl p-8"
                >
                  <div>
                    <span className="uppercase text-sm font-medium text-dark_black/60">
                      Facts & numbers
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-7xl font-medium dark:text-dark_black">91%</h2>
                    <h3 className="dark:text-dark_black text-2xl">
                      Clients recommend our tech services.
                    </h3>
                  </div>
                </motion.div>
              </div>

              <div className="flex flex-col xl:grid xl:grid-cols-12 gap-6">
                {/* Bottom Left Box */}
                <motion.div
                  ref={bottomLeftRef}
                  initial={{ x: -100, y: 100, opacity: 0 }}
                  animate={bottomLeftInView ? { x: 0, y: 0, opacity: 1 } : {}}
                  transition={{ duration: 0.35 }}
                  className="flex flex-col justify-between bg-dark_black dark:bg-white/10 rounded-2xl p-8 xl:col-span-7"
                >
                  <div className="flex flex-col gap-6">
                    <span className="text-white/60 uppercase text-sm font-medium">
                      Customer stories
                    </span>
                    <h3 className="text-white text-2xl">
                      “Icons, armoury, and a showroom without walls — built as a living product, not a brochure.”
                    </h3>
                    <div className="overflow-hidden rounded-xl bg-black">
                      <Image
                        src="/images/work/TRACKHAUZ/trackhauz-live-desktop.png"
                        alt="TRACKHAUZ digital showroom"
                        width={1440}
                        height={900}
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Bottom Right Box */}
                <motion.div
                  ref={bottomRightRef}
                  initial={{ x: 100, y: 100, opacity: 0 }}
                  animate={bottomRightInView ? { x: 0, y: 0, opacity: 1 } : {}}
                  transition={{ duration: 0.35 }}
                  className="flex flex-col gap-24 justify-between bg-dark_black/5 dark:bg-white/5 p-8 rounded-2xl xl:col-span-5"
                >
                  <div className="flex flex-col gap-6">
                    <span className="text-dark_black/60 dark:text-white/60 uppercase text-sm font-medium">
                      Customer stories
                    </span>
                    <h2 className="text-2xl lg:text-5xl">
                      “They turned a private obsession into a digital showroom. The collection, the parts program, the whole Hauz — it looks and moves the way we imagined it on the floor.”
                    </h2>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">TRACKHAUZ</p>
                    <p className="text-dark_black/60 dark:text-white/60 text-sm font-medium">
                      The Digital Showroom
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CustomerStories
