'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { commandCenterCockpit } from '@/lib/business-os-data';
import { GlassPanel, LiveDot, SectionLabel } from './ui-primitives';

const statusColors = {
  up: 'text-[#34D399]',
  live: 'text-[#60A5FA]',
  warn: 'text-[#FBBF24]',
  neutral: 'text-white',
};

function ConfidenceBar({ value, color = '#60A5FA' }: { value: number; color?: string }) {
  const filled = Math.round(value / 10);
  const empty = 10 - filled;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-mono">Confidence Score</p>
        <p className="text-sm font-mono text-[#60A5FA] tabular-nums">{value}%</p>
      </div>
      <div className="font-mono text-sm tracking-[0.15em] leading-none" style={{ color }}>
        <span>{'█'.repeat(filled)}</span>
        <span className="text-white/15">{'░'.repeat(empty)}</span>
      </div>
    </div>
  );
}

function AnimatedActions({ actions, inView }: { actions: readonly string[]; inView: boolean }) {
  const [visibleCount, setVisibleCount] = useState(3);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const reveal = setInterval(() => {
      setVisibleCount((count) => Math.min(count + 1, 5));
    }, 600);

    const rotate = setInterval(() => {
      setOffset((prev) => (prev + 1) % actions.length);
    }, 2800);

    return () => {
      clearInterval(reveal);
      clearInterval(rotate);
    };
  }, [inView, actions.length]);

  const visibleActions = Array.from({ length: visibleCount }, (_, i) => {
    const idx = (offset - i + actions.length * 4) % actions.length;
    return actions[idx];
  });

  return (
    <ul className="space-y-0 flex flex-col flex-1">
      {visibleActions.map((action, i) => (
        <motion.li
          key={`${offset}-${i}`}
          initial={{ opacity: 0, x: 12, height: 0 }}
          animate={{ opacity: 1, x: 0, height: 'auto' }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-2.5 py-2.5 text-sm font-mono text-white/65 border-b border-white/[0.04] last:border-0"
        >
          <span className="text-[#34D399] shrink-0">✓</span>
          <span className="truncate">{action}</span>
        </motion.li>
      ))}
    </ul>
  );
}

export function CommandCenterCockpitSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-12 md:py-16 border-t border-white/[0.06]">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 md:mb-10"
        >
          <SectionLabel>Executive view</SectionLabel>
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight">{commandCenterCockpit.title}</h2>
          <p className="mt-3 text-white/40">{commandCenterCockpit.subtitle}</p>
        </motion.div>

        <div ref={ref} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {commandCenterCockpit.metrics.map((metric) => (
              <GlassPanel key={metric.label} className="p-4 md:p-5">
                <p className="text-[9px] text-white/35 uppercase tracking-wider mb-2">{metric.label}</p>
                <p className={`text-xl md:text-2xl font-mono font-medium tabular-nums ${statusColors[metric.status]}`}>
                  {metric.value}
                </p>
                <p className="mt-1.5 text-[11px] font-mono text-white/40 leading-snug">{metric.delta}</p>
              </GlassPanel>
            ))}
          </div>

          <GlassPanel glow className="p-5 md:p-6 border-[#2563EB]/20">
            <div className="flex items-center justify-between gap-4 mb-5">
              <p className="text-[10px] uppercase tracking-wider text-[#60A5FA] font-mono flex items-center gap-2">
                <LiveDot size="sm" />
                AI Workforce Status
              </p>
              <span className="text-[10px] font-mono text-[#34D399]">8 AI Employees Active</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
              {commandCenterCockpit.workforceStatus.map((agent) => (
                <div key={agent.name} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="text-xs font-mono text-white/60 truncate">{agent.name}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <LiveDot size="sm" />
                    <span className="text-[10px] font-mono text-[#34D399]">{agent.status}</span>
                  </span>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel glow className="p-5 md:p-6 border-[#2563EB]/25 bg-[#2563EB]/[0.04]">
            <p className="text-[10px] uppercase tracking-wider text-[#60A5FA] font-mono mb-4">CEO Briefing</p>
            <p className="text-lg md:text-xl font-medium text-white mb-3">{commandCenterCockpit.ceoBriefing.greeting}</p>
            <p className="text-base text-white/70 mb-4">{commandCenterCockpit.ceoBriefing.summary}</p>
            <ul className="space-y-2 mb-5">
              {commandCenterCockpit.ceoBriefing.insights.map((insight) => (
                <li key={insight} className="flex items-start gap-2 text-sm text-white/50">
                  <span className="text-[#60A5FA] mt-0.5 shrink-0">→</span>
                  {insight}
                </li>
              ))}
            </ul>
            <div className="pt-4 border-t border-white/[0.06]">
              <p className="text-[10px] uppercase tracking-wider text-white/35 font-mono mb-2">Recommended focus</p>
              <p className="text-sm font-medium text-white">{commandCenterCockpit.ceoBriefing.recommendedFocus}</p>
            </div>
          </GlassPanel>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <GlassPanel glow className="p-5 md:p-6 border-[#2563EB]/25 flex flex-col">
              <p className="text-[10px] uppercase tracking-wider text-[#60A5FA] font-mono mb-4">AI Recommendation</p>
              <p className="text-xs text-white/40 mb-2">{commandCenterCockpit.aiRecommendation.title}</p>
              <p className="text-base font-medium text-white mb-4">{commandCenterCockpit.aiRecommendation.action}</p>
              <p className="text-sm font-mono text-white/50 mb-5">
                Expected: <span className="text-[#34D399]">{commandCenterCockpit.aiRecommendation.expected}</span>
              </p>
              <div className="mb-5">
                <ConfidenceBar value={commandCenterCockpit.aiRecommendation.confidence} />
              </div>
              <button
                type="button"
                className="mt-auto w-full py-2.5 bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8] transition-colors"
              >
                Approve
              </button>
            </GlassPanel>

            <GlassPanel className="p-5 md:p-6 border-[#F87171]/25 bg-[#F87171]/[0.05] flex flex-col">
              <p className="text-[10px] uppercase tracking-wider text-[#F87171] font-mono mb-5 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F87171] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F87171]" />
                </span>
                {commandCenterCockpit.risk.title}
              </p>

              <p className="text-2xl font-mono font-medium text-white mb-6">{commandCenterCockpit.risk.sku}</p>

              <div className="space-y-4 mb-6 flex-1">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/35 font-mono mb-1">
                    {commandCenterCockpit.risk.countdownLabel}
                  </p>
                  <p className="text-3xl font-mono font-medium text-[#FBBF24] tabular-nums">
                    {commandCenterCockpit.risk.countdown}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/35 font-mono mb-1">
                    {commandCenterCockpit.risk.lossLabel}
                  </p>
                  <p className="text-2xl font-mono font-medium text-[#F87171] tabular-nums">
                    {commandCenterCockpit.risk.loss}
                  </p>
                </div>
                <ConfidenceBar value={commandCenterCockpit.risk.confidence} color="#FBBF24" />
              </div>

              <button
                type="button"
                className="mt-auto w-full py-2.5 border border-[#F87171]/50 bg-[#F87171]/10 text-[#F87171] text-sm font-medium hover:bg-[#F87171]/20 transition-colors"
              >
                {commandCenterCockpit.risk.actionLabel}
              </button>
            </GlassPanel>

            <GlassPanel className="p-5 md:p-6 flex flex-col min-h-[280px]">
              <p className="text-[10px] uppercase tracking-wider text-[#34D399] font-mono mb-4 flex items-center gap-2">
                <LiveDot size="sm" /> Actions Taken Today
              </p>
              <AnimatedActions actions={commandCenterCockpit.autonomousActions} inView={inView} />
            </GlassPanel>
          </div>
        </div>
      </div>
    </section>
  );
}
