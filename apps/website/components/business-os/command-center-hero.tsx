'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { commandCenterHero, hudMetrics, liveActivityFeed } from '@/lib/business-os-data';
import { GlassPanel, LiveDot } from './ui-primitives';

function LiveOsPreview() {
  const feedRef = useRef<HTMLDivElement>(null);
  const [slotCount, setSlotCount] = useState(8);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;

    const measure = () => {
      const height = el.clientHeight;
      const slots = Math.max(6, Math.min(18, Math.floor(height / 34)));
      setSlotCount(slots);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => (prev + 1) % liveActivityFeed.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const visibleFeed = useMemo(
    () =>
      Array.from({ length: slotCount }, (_, i) => {
        const idx = (offset - i + liveActivityFeed.length * 8) % liveActivityFeed.length;
        return liveActivityFeed[idx];
      }),
    [offset, slotCount],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.7 }}
      className="mt-8 w-full max-w-lg lg:flex-1 lg:flex lg:flex-col lg:min-h-0 lg:mt-6"
    >
      <GlassPanel glow className="overflow-hidden lg:flex-1 lg:flex lg:flex-col lg:min-h-0">
        <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between bg-[#2563EB]/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <LiveDot />
            <span className="text-[10px] uppercase tracking-wider text-[#60A5FA] font-mono">
              Live OS Preview
            </span>
          </div>
          <span className="text-[10px] font-mono text-white/30">8 agents active</span>
        </div>
        <div
          ref={feedRef}
          className="px-3 py-2 flex-1 min-h-0 max-h-[160px] lg:max-h-none overflow-hidden flex flex-col"
        >
          {visibleFeed.map((entry, i) => (
            <motion.div
              key={i}
              layout
              className="flex flex-1 min-h-[30px] gap-3 px-2 items-center font-mono text-[11px] border-b border-white/[0.04] last:border-0"
              animate={i === 0 ? { backgroundColor: ['rgba(37,99,235,0.12)', 'rgba(37,99,235,0)'] } : {}}
              transition={i === 0 ? { duration: 0.8 } : { layout: { duration: 0.25 } }}
            >
              <span className="text-white/25 shrink-0 tabular-nums">{entry.time}</span>
              <span className="text-[#60A5FA]/80 shrink-0 w-24 truncate">{entry.agent}</span>
              <span className="text-white/60 truncate">{entry.action}</span>
            </motion.div>
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function RadarMetrics() {
  const radarHeight = 640;
  const cx = 28;
  const cy = radarHeight / 2;
  const ringMax = 248;
  const cardOutset = 52;
  const cardRadius = ringMax + cardOutset;
  const cardWidth = 152;
  const arcStart = -62;
  const arcEnd = 62;

  const angles = hudMetrics.map((_, i) => arcStart + (i * (arcEnd - arcStart)) / (hudMetrics.length - 1));

  const cardPositions = angles.map((angleDeg) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + cardRadius * Math.cos(angleRad),
      y: cy + cardRadius * Math.sin(angleRad),
      angleDeg,
      angleRad,
      blipX: cx + ringMax * Math.cos(angleRad),
      blipY: cy + ringMax * Math.sin(angleRad),
    };
  });

  const sweepSpread = 14;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="hidden lg:block relative w-[440px] shrink-0 overflow-visible"
      style={{ height: radarHeight }}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        viewBox={`0 0 440 ${radarHeight}`}
        aria-hidden
      >
        <defs>
          <clipPath id="radar-sweep-clip">
            <circle cx={cx} cy={cy} r={ringMax} />
          </clipPath>
        </defs>

        {[82, 164, 246, ringMax].map((r) => (
          <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="rgba(37,99,235,0.14)" strokeWidth="1" />
        ))}
        <line x1={cx} y1={cy - ringMax} x2={cx} y2={cy + ringMax} stroke="rgba(37,99,235,0.07)" strokeWidth="1" />
        <line x1={cx} y1={cy} x2={cx + ringMax} y2={cy} stroke="rgba(37,99,235,0.07)" strokeWidth="1" />

        {cardPositions.map((pos, i) => (
          <line
            key={`spoke-${i}`}
            x1={cx}
            y1={cy}
            x2={pos.blipX}
            y2={pos.blipY}
            stroke="rgba(37,99,235,0.18)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
        ))}

        <g clipPath="url(#radar-sweep-clip)">
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${cx} ${cy}`}
              to={`360 ${cx} ${cy}`}
              dur="10s"
              repeatCount="indefinite"
            />
            <path
              d={(() => {
                const a1 = (-sweepSpread * Math.PI) / 180;
                const a2 = (sweepSpread * Math.PI) / 180;
                const x1 = cx + ringMax * Math.cos(a1);
                const y1 = cy + ringMax * Math.sin(a1);
                const x2 = cx + ringMax * Math.cos(a2);
                const y2 = cy + ringMax * Math.sin(a2);
                return `M ${cx} ${cy} L ${x1} ${y1} A ${ringMax} ${ringMax} 0 0 1 ${x2} ${y2} Z`;
              })()}
              fill="rgba(37,99,235,0.07)"
            />
            <line
              x1={cx}
              y1={cy}
              x2={cx + ringMax}
              y2={cy}
              stroke="rgba(96,165,250,0.55)"
              strokeWidth="1.5"
            />
            <polygon
              points={`${cx + ringMax},${cy} ${cx + ringMax - 9},${cy - 5} ${cx + ringMax - 9},${cy + 5}`}
              fill="rgba(96,165,250,0.9)"
            />
          </g>
        </g>

        <circle cx={cx} cy={cy} r="3" fill="rgba(96,165,250,0.9)" />
        <circle cx={cx} cy={cy} r="9" fill="none" stroke="rgba(37,99,235,0.35)" strokeWidth="1" />

        {cardPositions.map((pos, i) => (
          <circle key={`blip-${i}`} cx={pos.blipX} cy={pos.blipY} r="3.5" fill="rgba(52,211,153,0.85)" />
        ))}
      </svg>

      {hudMetrics.map((metric, i) => {
        const { x, y, angleDeg } = cardPositions[i];
        return (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.08, duration: 0.5 }}
            className="absolute z-10"
            style={{
              left: x,
              top: y,
              width: cardWidth,
              transform: `translate(-50%, -50%) rotate(${angleDeg + 90}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <GlassPanel className="px-3 py-2">
              <p className="text-[9px] uppercase tracking-[0.12em] text-white/40 mb-0.5 whitespace-nowrap">{metric.label}</p>
              <p className="text-sm font-mono font-medium text-white tabular-nums whitespace-nowrap">{metric.value}</p>
              <p className="text-[9px] text-[#34D399] font-mono mt-0.5 whitespace-nowrap">{metric.delta}</p>
            </GlassPanel>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function MetricsStrip() {
  return (
    <div className="flex lg:hidden gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      {hudMetrics.map((metric) => (
        <div key={metric.label} className="shrink-0 px-3 py-2 border border-white/[0.08] bg-white/[0.03] min-w-[120px]">
          <p className="text-[9px] text-white/40 uppercase tracking-wider">{metric.label}</p>
          <p className="text-sm font-mono text-white tabular-nums">{metric.value}</p>
          <p className="text-[9px] text-[#34D399] font-mono">{metric.delta}</p>
        </div>
      ))}
    </div>
  );
}

export function CommandCenterHero() {
  return (
    <section className="relative flex flex-col overflow-visible">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_30%_30%,rgba(37,99,235,0.1),transparent_70%)]" />

      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(37,99,235,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.4) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 40% 35%, black, transparent)',
        }}
      />

      <div className="relative z-10 max-w-[1400px] mx-auto w-full px-5 md:px-8 pt-20 pb-16 md:pb-20 lg:pb-24">
        <div className="flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-10 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-1 min-w-0 max-w-2xl lg:flex lg:flex-col lg:h-[622px]"
          >
            <div className="flex items-center gap-2 mb-5">
              <LiveDot size="md" />
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#34D399] font-mono">
                System operational
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium text-white leading-[1.05] tracking-tight">
              {commandCenterHero.headline}
            </h1>
            <p className="mt-5 text-base md:text-lg text-white/50 max-w-xl leading-relaxed">
              {commandCenterHero.subheadline}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href={commandCenterHero.primaryCta.href}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8] transition-colors shadow-[0_0_30px_rgba(37,99,235,0.35)]"
              >
                {commandCenterHero.primaryCta.label}
                <span aria-hidden>→</span>
              </Link>
              <Link
                href={commandCenterHero.secondaryCta.href}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-white/15 text-white/70 text-sm font-medium hover:border-[#2563EB]/50 hover:text-white transition-colors bg-white/[0.03]"
              >
                {commandCenterHero.secondaryCta.label}
              </Link>
            </div>

            <MetricsStrip />
            <LiveOsPreview />
          </motion.div>

          <div className="hidden lg:flex shrink-0 h-[640px] items-center">
            <RadarMetrics />
          </div>
        </div>
      </div>
    </section>
  );
}
