import type { Metadata } from "next";
import { Inter_Tight, Instrument_Serif } from "next/font/google";
import "@/styles/globals.css";
import { ConditionalLayout } from "@/components/conditional-layout";
import Providers from "@/lib/providers/Provider";
import { rootMetadata } from "@/lib/seo";

const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = rootMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${interTight.variable} ${instrumentSerif.variable} ${interTight.className}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>
          <ConditionalLayout>{children}</ConditionalLayout>
        </Providers>
      </body>
    </html>
  );
}
