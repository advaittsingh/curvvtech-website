'use client';

import { usePathname } from 'next/navigation';
import Header from './layout/header';
import Footer from './layout/footer/Footer';
import ScrollToTop from '@/components/scroll-to-top';
import { ChatWidget } from './chat/ChatWidget';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname === '/chat';
  const isBusinessOs = pathname === '/business-os' || pathname.startsWith('/business-os/');

  if (isChat || isBusinessOs) {
    return (
      <>
        {children}
        {!isBusinessOs && (
          <div className="pointer-events-none fixed bottom-6 right-6 z-1000 flex flex-row-reverse items-end gap-3">
            <div className="pointer-events-auto">
              <ScrollToTop />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
      <div className="pointer-events-none fixed bottom-6 right-6 z-1000 flex flex-row-reverse items-end gap-3">
        <div className="pointer-events-auto">
          <ScrollToTop />
        </div>
        <div className="pointer-events-auto min-w-0">
          <ChatWidget />
        </div>
      </div>
    </>
  );
}
