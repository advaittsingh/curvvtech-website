export function LiveDot({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'h-2 w-2' : 'h-1.5 w-1.5';
  return (
    <span className={`relative flex ${dim}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-60" />
      <span className={`relative inline-flex rounded-full ${dim} bg-[#34D399]`} />
    </span>
  );
}

export function GlassPanel({
  children,
  className = '',
  glow = false,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hover?: boolean;
}) {
  return (
    <div
      className={`relative border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl ${glow ? 'shadow-[0_0_40px_rgba(37,99,235,0.12)]' : ''} ${hover ? 'transition-all duration-300 hover:border-[#2563EB]/35 hover:bg-white/[0.05]' : ''} ${className}`}
    >
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#2563EB]/40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#2563EB]/40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#2563EB]/40 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#2563EB]/40 pointer-events-none" />
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.2em] text-[#2563EB] font-mono mb-4">{children}</p>
  );
}
