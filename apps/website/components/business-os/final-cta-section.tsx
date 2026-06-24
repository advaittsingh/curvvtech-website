'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { finalCta } from '@/lib/business-os-data';

export function FinalCtaSection() {
  return (
    <section className="py-12 md:py-16 border-t border-white/[0.06] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgba(37,99,235,0.12),transparent)]" />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 text-center relative">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-medium text-white tracking-tight leading-tight max-w-4xl mx-auto mb-5">
            {finalCta.headline}
          </h2>
          <p className="text-white/40 max-w-lg mx-auto mb-10 text-base md:text-lg">{finalCta.subheadline}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={finalCta.primary.href}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8] transition-colors min-w-[180px] shadow-[0_0_30px_rgba(37,99,235,0.3)]"
            >
              {finalCta.primary.label}
            </Link>
            <Link
              href={finalCta.secondary.href}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/12 text-white/65 text-sm font-medium hover:border-white/30 hover:text-white transition-colors min-w-[180px] bg-white/[0.02]"
            >
              {finalCta.secondary.label}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
