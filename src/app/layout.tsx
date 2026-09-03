import type { Metadata } from "next";
import { Inter, Oswald, Yellowtail } from "next/font/google";
import { SITE } from "@/lib/site";
import { MusicGroupJsonLd } from "@/components/json-ld";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const oswald = Oswald({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-oswald" });
const yellowtail = Yellowtail({ subsets: ["latin"], weight: "400", variable: "--font-yellowtail" });

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  metadataBase: new URL(SITE.domain),
  // LIVE: DNS flipped 2026-09-03 — indexable.
  robots: { index: true, follow: true },
  alternates: { canonical: SITE.domain },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.domain,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: `${SITE.name} on stage` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: ["/og.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable} ${yellowtail.variable}`}>
      <body className="min-h-screen bg-canvas text-ink">
        <MusicGroupJsonLd />
        {children}
      </body>
    </html>
  );
}
