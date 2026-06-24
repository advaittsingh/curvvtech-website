'use client';

import { motion } from 'motion/react';
import { businessBrain } from '@/lib/business-os-data';
import { LiveDot, SectionLabel } from './ui-primitives';

const agentPositions = {
  top: 'top-0 left-1/2 -translate-x-1/2',
  left: 'left-0 top-1/2 -translate-y-1/2',
  right: 'right-0 top-1/2 -translate-y-1/2',
  bottom: 'bottom-0 left-1/2 -translate-x-1/2',
};

function BrainVisualization() {
  return (
    <div className="relative w-full max-w-xl mx-auto aspect-square">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" aria-hidden>
        <defs>
          <radialGradient id="brain-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(37,99,235,0.35)" />
            <stop offset="100%" stopColor="rgba(37,99,235,0)" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="160" fill="url(#brain-glow)" />
        {[60, 100, 140].map((r) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="rgba(37,99,235,0.12)" strokeWidth="1" />
        ))}
        {businessBrain.agents.map((agent) => {
          const coords = {
            top: { x: 200, y: 55 },
            left: { x: 55, y: 200 },
            right: { x: 345, y: 200 },
            bottom: { x: 200, y: 345 },
          }[agent.position];
          return (
            <g key={agent.id}>
              <line x1="200" y1="200" x2={coords.x} y2={coords.y} stroke="rgba(37,99,235,0.25)" strokeWidth="1" strokeDasharray="4 4" />
              <motion.circle
                cx="200"
                cy="200"
                r="3"
                fill="#60A5FA"
                animate={{ cx: [200, coords.x, 200], cy: [200, coords.y, 200] }}
                transition={{ duration: 3, repeat: Infinity, delay: businessBrain.agents.indexOf(agent) * 0.7, ease: 'linear' }}
              />
            </g>
          );
        })}
      </svg>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <motion.div
          animate={{ scale: [1, 1.05, 1], boxShadow: ['0 0 30px rgba(37,99,235,0.3)', '0 0 50px rgba(37,99,235,0.5)', '0 0 30px rgba(37,99,235,0.3)'] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="flex flex-col items-center justify-center w-28 h-28 rounded-full border-2 border-[#2563EB]/50 bg-[#2563EB]/20 backdrop-blur-sm"
        >
          <LiveDot size="md" />
          <span className="text-[10px] font-mono text-[#60A5FA] uppercase tracking-wider mt-2 text-center leading-tight">Business<br />Brain</span>
        </motion.div>
      </div>

      {businessBrain.agents.map((agent, i) => (
        <motion.div
          key={agent.id}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className={`absolute ${agentPositions[agent.position]} z-10`}
        >
          <div className="px-3 py-2 border border-[#2563EB]/30 bg-[#030508]/90 backdrop-blur-sm text-center">
            <p className="text-[10px] font-mono text-[#60A5FA] uppercase tracking-wider whitespace-nowrap">{agent.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function BusinessBrainSection() {
  return (
    <section className="py-12 md:py-20 border-t border-white/[0.06] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(37,99,235,0.1),transparent)]" />
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-14"
        >
          <SectionLabel>The moat</SectionLabel>
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight">
            {businessBrain.headline}{' '}
            <span className="text-[#60A5FA]">{businessBrain.headlineLine2}</span>
          </h2>
          <p className="mt-4 text-white/40 max-w-2xl mx-auto">{businessBrain.description}</p>
        </motion.div>

        <BrainVisualization />

        <div className="flex flex-wrap justify-center gap-2 mt-10">
          {businessBrain.learns.map((item) => (
            <span key={item} className="px-3 py-1.5 text-xs font-mono text-white/45 border border-white/[0.08] bg-white/[0.02]">
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
