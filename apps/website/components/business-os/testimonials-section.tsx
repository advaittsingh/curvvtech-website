'use client';

import { motion } from 'motion/react';
import { testimonials } from '@/lib/business-os-data';
import { GlassPanel, SectionLabel } from './ui-primitives';

export function TestimonialsSection() {
  return (
    <section className="py-12 md:py-16 border-t border-white/[0.06]">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 md:mb-10">
          <SectionLabel>Results</SectionLabel>
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight">Companies already running on Business OS.</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.company}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassPanel className="p-6 md:p-8 h-full flex flex-col gap-5">
                <p className="text-lg text-white/75 leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-end justify-between gap-4 pt-4 border-t border-white/[0.06]">
                  <div>
                    <p className="text-sm font-medium text-white">{t.author}</p>
                    <p className="text-xs text-white/40">{t.company}</p>
                  </div>
                  <p className="text-sm font-mono text-[#34D399] shrink-0">{t.metric}</p>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
