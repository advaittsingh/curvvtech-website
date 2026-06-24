'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { whiteLabelMajor } from '@/lib/business-os-data';
import { GlassPanel, SectionLabel } from './ui-primitives';

export function WhiteLabelMajorSection() {
  return (
    <section className="py-12 md:py-20 border-t border-white/[0.06] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(37,99,235,0.15),transparent)]" />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <SectionLabel>Partner program</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight leading-tight mb-4">
              {whiteLabelMajor.headline}
            </h2>
            <p className="text-lg text-white/50 mb-2">{whiteLabelMajor.subheadline}</p>
            <p className="text-white/35 leading-relaxed mb-8">{whiteLabelMajor.description}</p>
            <div className="grid grid-cols-2 gap-2 mb-8">
              {whiteLabelMajor.benefits.map((b) => (
                <span key={b} className="text-xs text-white/55 px-3 py-2 border border-white/[0.08] bg-white/[0.02]">{b}</span>
              ))}
            </div>
            <Link
              href={whiteLabelMajor.cta.href}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8] shadow-[0_0_40px_rgba(37,99,235,0.3)]"
            >
              {whiteLabelMajor.cta.label} →
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-0"
          >
            <GlassPanel glow className="px-8 py-4 text-center w-full max-w-xs">
              <p className="text-sm font-mono text-[#60A5FA]">Business OS</p>
            </GlassPanel>
            {[1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center py-2">
                <div className="w-px h-8 bg-linear-to-b from-[#2563EB]/50 to-[#2563EB]/20" />
                <span className="text-[#2563EB]/40 text-lg">↓</span>
              </div>
            ))}
            <GlassPanel className="px-8 py-5 text-center w-full max-w-sm border-[#2563EB]/30">
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-mono mb-2">Your Logo Here</p>
              <p className="text-xl font-medium text-white">Partner Brand</p>
              <p className="text-xs text-[#60A5FA]/70 mt-2 font-mono">Powered by Business OS</p>
            </GlassPanel>
            {[1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center py-2">
                <div className="w-px h-8 bg-linear-to-b from-[#2563EB]/50 to-[#2563EB]/20" />
                <span className="text-[#2563EB]/40 text-lg">↓</span>
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2 w-full max-w-md">
              {['Client A', 'Client B', 'Client C'].map((c) => (
                <GlassPanel key={c} className="px-3 py-3 text-center">
                  <p className="text-[10px] font-mono text-white/50">{c}</p>
                </GlassPanel>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
