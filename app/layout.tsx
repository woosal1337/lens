import type { Metadata, Viewport } from "next";
import { LanguageProvider } from "@/lib/i18n/provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { contentSecurityPolicy } from "@/lib/security/csp";
import { FIRST_PAINT_THEME } from "@/lib/security/first-paint";
import { groundHex } from "@/styles/tokens.stylex";
import "@/styles/globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4174";
const TAGLINE = "Read your Instagram export on your own machine. No upload, no account, no server.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Lens", template: "%s · Lens" },
  description: TAGLINE,
  applicationName: "Lens",
  referrer: "no-referrer",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Lens",
    title: "Lens",
    description: TAGLINE,
    url: SITE
  },
  twitter: {
    card: "summary_large_image",
    title: "Lens",
    description: TAGLINE
  },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: groundHex.light },
    { media: "(prefers-color-scheme: dark)", color: groundHex.dark }
  ]
};

const CSP = contentSecurityPolicy(process.env.NODE_ENV === "development");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
        <script dangerouslySetInnerHTML={{ __html: FIRST_PAINT_THEME }} />
      </head>
      <body>
        <LanguageProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
