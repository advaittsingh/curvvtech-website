'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { businessTimeline } from '@/lib/business-os-data';
import { SectionLabel } from './ui-primitives';

export function BusinessTimelineSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      setVisibleCount(count);
      if (count >= businessTimeline.length) clearInterval(interval);
    }, 550);
    return () => clearInterval(interval);
  }, [inView]);

  return (
    <section id="watch-work" className="py-12 md:py-16 border-t border-white/[0.06] relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_50%_at_0%_50%,rgba(37,99,235,0.07),transparent)]" />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 relative">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 md:mb-10">
          <SectionLabel>Live operations</SectionLabel>
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight">Watch Business OS work.</h2>
          <p className="mt-3 text-white/40 max-w-md">One deal. Eight AI handoffs. Zero manual steps.</p>
        </motion.div>

        <div ref={ref} className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 lg:gap-12">
          <div className="relative pl-7 border-l border-[#2563EB]/20">
            {businessTimeline.map((entry, index) => {
              const visible = index < visibleCount;
              const latest = index === visibleCount - 1;
              return (
                <motion.div
                  key={entry.time}
                  initial={{ opacity: 0, x: -8 }}
                  animate={visible ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.35 }}
                  className="relative pb-7 last:pb-0"
                >
                  <div
                    className={`absolute -left-[31px] top-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                      latest ? 'border-[#34D399] bg-[#34D399] shadow-[0_0_10px_rgba(52,211,153,0.7)]' : visible ? 'border-[#2563EB] bg-[#030508]' : 'border-white/10 bg-[#030508]'
                    }`}
                  />
                  <div className="flex flex-col sm:flex-row sm:gap-8">
                    <time className="font-mono text-xs text-[#2563EB]/60 tabular-nums w-24 shrink-0">{entry.time}</time>
                    <p className={`font-mono text-sm ${latest ? 'text-white' : visible ? 'text-white/55' : 'text-white/20'}`}>{entry.event}</p>
                  </div>
                </motion.div>
              );
            })}
            {visibleCount >= businessTimeline.length && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 font-mono text-xs text-[#34D399]/80">
                ✓ Cycle complete — 2h 25m, fully autonomous
              </motion.p>
            )}
          </div>

          {/* Workflow viz */}
          <div className="hidden lg:block">
            <div className="sticky top-28 border border-white/[0.06] bg-white/[0.02] p-5 font-mono text-[10px]">
              <p className="text-[#60A5FA] uppercase tracking-wider mb-4">Workflow status</p>
              {businessTimeline.map((entry, i) => (
                <div key={entry.time} className={`py-1.5 flex justify-between gap-2 ${i < visibleCount ? 'text-white/50' : 'text-white/15'}`}>
                  <span className="truncate">{entry.event}</span>
                  <span className={i < visibleCount ? 'text-[#34D399]' : ''}>{i < visibleCount ? '✓' : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
