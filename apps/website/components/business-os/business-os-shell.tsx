'use client';

import Link from 'next/link';
import { businessOsNav } from '@/lib/business-os-data';

export function BusinessOsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#030508] text-white selection:bg-[#2563EB]/30">
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#030508]/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 h-14 flex items-center justify-between">
          <Link href="/business-os" className="flex items-baseline gap-2 group">
            <span className="text-sm font-semibold tracking-tight text-white group-hover:text-[#60A5FA] transition-colors">
              {businessOsNav.product}
            </span>
            <span className="text-[11px] text-white/30 font-normal">{businessOsNav.byline}</span>
          </Link>
          <Link
            href={businessOsNav.cta.href}
            className="text-xs font-medium px-4 py-2 rounded-md border border-white/10 bg-white/[0.04] hover:bg-[#2563EB]/20 hover:border-[#2563EB]/40 transition-all duration-200"
          >
            {businessOsNav.cta.label}
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
