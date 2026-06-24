'use client';

import { motion } from 'motion/react';
import { roadmapPhases } from '@/lib/business-os-data';
import { SectionLabel } from './ui-primitives';

const statusStyle = {
  active: { dot: 'bg-[#34D399] shadow-[0_0_12px_rgba(52,211,153,0.6)]', label: 'text-[#34D399]', line: 'bg-[#2563EB]' },
  upcoming: { dot: 'bg-[#2563EB]/50', label: 'text-[#60A5FA]/60', line: 'bg-[#2563EB]/30' },
  future: { dot: 'bg-white/20', label: 'text-white/30', line: 'bg-white/10' },
};

export function RoadmapSection() {
  return (
    <section className="py-12 md:py-16 border-t border-white/[0.06]">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 md:mb-10">
          <SectionLabel>Roadmap</SectionLabel>
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight">Building the AI workforce ecosystem.</h2>
        </motion.div>

        <div className="relative">
          <div className="hidden md:block absolute top-6 left-0 right-0 h-px bg-white/[0.06]" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
            {roadmapPhases.map((phase, index) => {
              const style = statusStyle[phase.status];
              return (
                <motion.div
                  key={phase.phase}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.12 }}
                  className="relative md:pt-12"
                >
                  <div className={`hidden md:block absolute top-[21px] left-0 w-full h-0.5 ${style.line} ${index === 0 ? 'rounded-l' : ''}`} style={{ width: index === roadmapPhases.length - 1 ? '50%' : '100%' }} />
                  <div className={`hidden md:flex absolute top-3 left-0 w-6 h-6 rounded-full border-2 border-[#030508] items-center justify-center ${style.dot}`} />
                  <p className={`text-[11px] font-mono uppercase tracking-wider mb-2 ${style.label}`}>
                    {phase.phase}{phase.status === 'active' ? ' · Now' : ''}
                  </p>
                  <h3 className="text-base md:text-lg font-medium text-white leading-snug">{phase.title}</h3>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
