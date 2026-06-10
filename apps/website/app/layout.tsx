import "@/styles/globals.css";
import { ConditionalLayout } from "@/components/conditional-layout";
import Providers from "@/lib/providers/Provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <body>
        <Providers>
          <ConditionalLayout>{children}</ConditionalLayout>
        </Providers>
      </body>
    </html>
  );
}
