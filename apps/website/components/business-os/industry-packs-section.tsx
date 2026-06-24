'use client';

import { motion } from 'motion/react';
import { industryTransformations } from '@/lib/business-os-data';
import { GlassPanel, SectionLabel } from './ui-primitives';

export function IndustryPacksSection() {
  return (
    <section className="py-12 md:py-16 border-t border-white/[0.06]">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 md:mb-10">
          <SectionLabel>Deployments</SectionLabel>
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight">Industry transformations.</h2>
          <p className="mt-3 text-white/40 max-w-lg">See what changes when an AI workforce replaces manual operations.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {industryTransformations.map((industry, index) => (
            <motion.div
              key={industry.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassPanel className="p-5 md:p-6 h-full flex flex-col gap-5">
                <h3 className="text-xl font-medium text-white">{industry.name}</h3>

                <div>
                  <p className="text-[9px] uppercase tracking-wider text-red-400/70 font-mono mb-3">Without Business OS</p>
                  <ul className="space-y-2">
                    {industry.without.map((item) => (
                      <li key={item} className="text-sm text-white/35 flex gap-2">
                        <span className="text-red-400/50 shrink-0">✕</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-center text-[#2563EB]/50 font-mono text-lg">↓</div>

                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#34D399] font-mono mb-3">With Business OS</p>
                  <ul className="space-y-2">
                    {industry.with.map((item) => (
                      <li key={item} className="text-sm text-white/70 flex gap-2">
                        <span className="text-[#34D399] shrink-0">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-4 border-t border-white/[0.06]">
                  <p className="text-2xl font-mono font-medium text-[#60A5FA]">{industry.outcome}</p>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
