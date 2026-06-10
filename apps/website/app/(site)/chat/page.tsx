'use client'

import Script from 'next/script'

declare global {
  interface Window {
    Tawk_API?: { showWidget?: () => void; maximize?: () => void }
  }
}

const PROPERTY_ID = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID
const WIDGET_ID = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID

function openTawkWidget() {
  if (typeof window !== 'undefined' && window.Tawk_API) {
    window.Tawk_API.showWidget?.()
    window.Tawk_API.maximize?.()
  }
}

export default function ChatPage() {
  if (!PROPERTY_ID || !WIDGET_ID) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 bg-white p-6 dark:bg-dark_black">
        <p className="text-center text-dark_black/70 dark:text-white/70">
          Live chat is not configured. Please contact us via the contact page.
        </p>
        <a
          href="/contact"
          className="text-purple_blue underline"
          target="_parent"
          rel="noopener noreferrer"
        >
          Go to Contact
        </a>
      </div>
    )
  }

  return (
    <>
      <Script
        id="tawk-api-config-chat"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.Tawk_API = window.Tawk_API || {};
            window.Tawk_API.autoStart = false;
            window.Tawk_API.onLoad = function() {
              window.Tawk_API.showWidget();
              window.Tawk_API.maximize();
            };
          `,
        }}
      />
      <Script
        id="tawk-embed-chat"
        strategy="afterInteractive"
        src={`https://embed.tawk.to/${PROPERTY_ID}/${WIDGET_ID}`}
        crossOrigin="anonymous"
        onLoad={openTawkWidget}
      />
      <div className="min-h-[400px] w-full bg-white dark:bg-dark_black" />
    </>
  )
}
