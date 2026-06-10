'use client'

import Script from 'next/script'

const PROPERTY_ID = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID
const WIDGET_ID = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID

export function TawkScript() {
  if (!PROPERTY_ID || !WIDGET_ID) return null

  return (
    <>
      <Script
        id="tawk-api-config"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.Tawk_API = window.Tawk_API || {};
            window.Tawk_API.autoStart = false;
          `,
        }}
      />
      <Script
        id="tawk-embed"
        strategy="afterInteractive"
        src={`https://embed.tawk.to/${PROPERTY_ID}/${WIDGET_ID}`}
        crossOrigin="anonymous"
      />
    </>
  )
}
