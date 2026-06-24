'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { businessOsInAction } from '@/lib/business-os-data';
import { GlassPanel, SectionLabel } from './ui-primitives';

export function BusinessOsInActionSection() {
  const [activeStep, setActiveStep] = useState(0);
  const steps = businessOsInAction.steps;

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <section className="py-12 md:py-16 border-t border-white/[0.06] overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 md:mb-10 text-center"
        >
          <SectionLabel>End-to-end automation</SectionLabel>
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight">{businessOsInAction.title}</h2>
          <p className="mt-3 text-white/40">{businessOsInAction.subtitle}</p>
        </motion.div>

        <GlassPanel glow className="p-8 md:p-12 border-[#2563EB]/20 bg-[#2563EB]/[0.03]">
          <div className="relative max-w-md mx-auto">
            <div
              className="absolute left-1/2 top-6 bottom-6 w-px -translate-x-1/2 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent, rgba(37,99,235,0.5) 15%, rgba(37,99,235,0.5) 85%, transparent)',
              }}
            />
            <motion.div
              className="absolute left-1/2 w-1 -translate-x-1/2 rounded-full pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, rgba(96,165,250,0), rgba(96,165,250,0.9), rgba(96,165,250,0))',
                boxShadow: '0 0 12px rgba(37,99,235,0.8)',
              }}
              animate={{
                top: `${(activeStep / (steps.length - 1)) * 85 + 5}%`,
                height: '12%',
              }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />

            <div className="relative space-y-0">
              {steps.map((step, i) => {
                const isActive = i === activeStep;
                const isPast = i < activeStep;

                return (
                  <div key={step.label} className="flex flex-col items-center">
                    <motion.div
                      animate={{
                        borderColor: isActive
                          ? 'rgba(37,99,235,0.9)'
                          : isPast
                            ? 'rgba(52,211,153,0.55)'
                            : 'rgba(255,255,255,0.1)',
                        boxShadow: isActive
                          ? '0 0 32px rgba(37,99,235,0.45), inset 0 0 20px rgba(37,99,235,0.08)'
                          : isPast
                            ? '0 0 12px rgba(52,211,153,0.2)'
                            : 'none',
                        scale: isActive ? 1.03 : 1,
                      }}
                      transition={{ duration: 0.4 }}
                      className="relative z-10 w-full max-w-xs px-6 py-3.5 border bg-[#030508]/80 backdrop-blur-sm text-center"
                    >
                      <p
                        className={`text-sm md:text-base font-mono font-medium ${
                          isActive ? 'text-[#60A5FA]' : isPast ? 'text-[#34D399]' : 'text-white/45'
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.agent && (
                        <p className="text-[10px] font-mono text-white/30 mt-1">{step.agent}</p>
                      )}
                    </motion.div>

                    {i < steps.length - 1 && (
                      <motion.div
                        animate={{
                          opacity: isPast ? 0.9 : isActive ? 0.6 : 0.2,
                          color: isPast ? 'rgba(52,211,153,0.8)' : 'rgba(96,165,250,0.5)',
                        }}
                        className="py-2 text-lg font-mono z-10"
                      >
                        ↓
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-10 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 border border-[#34D399]/30 bg-[#34D399]/[0.06]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]" />
              </span>
              <span className="text-xs font-mono text-[#34D399]">
                Live pipeline — {steps[activeStep].label}
              </span>
            </div>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
