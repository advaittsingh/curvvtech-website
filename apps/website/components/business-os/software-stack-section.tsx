'use client';

import { motion } from 'motion/react';
import { legacyStack, stackReplacement } from '@/lib/business-os-data';
import { GlassPanel, SectionLabel } from './ui-primitives';

export function SoftwareStackSection() {
  return (
    <section className="py-12 md:py-16 border-t border-white/[0.06] overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 md:mb-10">
          <SectionLabel>Consolidation</SectionLabel>
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight max-w-3xl">
            Replace your entire software stack.
          </h2>
          <p className="mt-3 text-white/40 max-w-lg">Eight tools. Eight logins. Zero coordination. Watch them collapse into one operating system.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Fragmented stack */}
          <div className="relative">
            <p className="text-[10px] uppercase tracking-wider text-white/25 font-mono mb-6">Your stack today</p>
            <div className="grid grid-cols-2 gap-2">
              {legacyStack.map((tool, i) => (
                <motion.div
                  key={tool}
                  initial={{ opacity: 0, scale: 1 }}
                  whileInView={{ opacity: 0.35, scale: 0.92 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="px-4 py-3 border border-white/[0.06] bg-white/[0.02] text-white/40 text-sm font-mono"
                >
                  {tool}
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-xs font-mono text-red-400/60"
            >
              ↑ 8 systems · 8 data silos · constant context switching
            </motion.div>
          </div>

          {/* Collapse arrow + Business OS */}
          <div className="relative">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              className="hidden lg:block absolute -left-10 top-1/2 w-8 h-px bg-[#2563EB]/50 origin-left"
            />
            <GlassPanel glow className="p-8 md:p-10">
              <p className="text-[10px] uppercase tracking-wider text-[#60A5FA] font-mono mb-6">One operating system</p>
              <p className="text-4xl md:text-5xl font-medium text-white mb-10 tracking-tight">{stackReplacement.platform}</p>
              <div className="space-y-5">
                {stackReplacement.stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-baseline gap-4 border-b border-white/[0.06] pb-5 last:border-0"
                  >
                    <span className="text-4xl md:text-5xl font-mono font-light text-[#60A5FA] tabular-nums">{stat.value}</span>
                    <span className="text-white/50">{stat.label}</span>
                  </motion.div>
                ))}
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </section>
  );
}
