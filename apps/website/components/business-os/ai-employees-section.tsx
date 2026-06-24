'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { aiEmployees } from '@/lib/business-os-data';
import { GlassPanel, LiveDot, SectionLabel } from './ui-primitives';

export function AiEmployeesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-12 md:py-16 border-t border-white/[0.06]">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 md:mb-10">
          <SectionLabel>Workforce</SectionLabel>
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight">Meet your AI employees.</h2>
          <p className="mt-3 text-white/40 max-w-lg">Living team members — working, deciding, and executing right now.</p>
        </motion.div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiEmployees.map((employee, index) => (
            <motion.div
              key={employee.id}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <GlassPanel glow className="p-5 md:p-6 h-full flex flex-col gap-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 font-mono text-sm text-[#60A5FA]">
                      {employee.avatar}
                      <span className="absolute -bottom-0.5 -right-0.5"><LiveDot size="sm" /></span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">{employee.name}</h3>
                      <p className="text-xs text-white/40">{employee.role}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#34D399] uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                    <LiveDot size="sm" /> {employee.status}
                  </span>
                </div>

                <div className="rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/[0.06] px-4 py-3">
                  <p className="text-[9px] uppercase tracking-wider text-[#60A5FA] font-mono mb-1">Current task</p>
                  <p className="text-sm text-white/80 font-mono">{employee.currentTask}</p>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-wider text-white/30 font-mono mb-3">Today</p>
                  <div className="grid grid-cols-3 gap-3">
                    {employee.today.map((stat) => (
                      <div key={stat.label}>
                        <p className="text-lg font-mono font-medium text-white tabular-nums">{stat.value}</p>
                        <p className="text-[10px] text-white/35 leading-tight mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] mt-auto">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-white/30 font-mono">Confidence</p>
                    <p className="text-sm font-mono text-[#34D399]">{employee.confidence}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-wider text-white/30 font-mono">Next action</p>
                    <p className="text-xs font-mono text-white/55">{employee.nextAction}</p>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
