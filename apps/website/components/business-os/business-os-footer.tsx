'use client';

import Link from 'next/link';
import { businessOsFooter } from '@/lib/business-os-data';

export function BusinessOsFooter() {
  return (
    <footer className="border-t border-white/[0.06] py-8 md:py-10">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <p className="text-sm font-semibold text-white">{businessOsFooter.copyright}</p>
            <p className="text-xs text-white/30 mt-1">The operating system for running a business.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {businessOsFooter.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
