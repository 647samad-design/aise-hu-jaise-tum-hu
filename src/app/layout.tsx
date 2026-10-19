import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Link from "next/link";
import "./globals.css";
import "./ui.css";
import Nav from "@/components/Nav";
import RegisterSW from "@/components/RegisterSW";
import { FlashToast } from "@/components/ClientBits";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "1Rupya - Win gadgets for PKR 1", template: "%s" },
  description: "Tiny tickets, real prizes. Every draw is provably fair and the winner is chosen only when every ticket is sold.",
  manifest: "/manifest.webmanifest",
  applicationName: "1Rupya",
  appleWebApp: { capable: true, title: "1Rupya", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  openGraph: {
    type: "website",
    siteName: "1Rupya",
    title: "1Rupya - Small tickets. Big possibilities.",
    description: "Tickets from PKR 1. Draws run only when every ticket sells, and anyone can verify the winner.",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }],
  },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  themeColor: "#103f34",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const support = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <Nav />
        <main id="main" className="site-main">{children}</main>
        <footer className="site-footer">
          <div>
            <Link href="/" className="footer-brand">1Rupya<span>Small tickets. Big possibilities.</span></Link>
            <p>Made for possibility. Built on transparency.</p>
          </div>
          <div className="footer-links">
            <Link href="/#draws">Explore draws</Link>
            <Link href="/winners">Past results</Link>
            <Link href="/#fairness">Fairness</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            {support && <a href={`https://wa.me/${support.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">Support</a>}
          </div>
          <p className="footer-disclaimer">
            18+ only · Participation does not guarantee a prize.<br />
            © {new Date().getFullYear()} 1Rupya. Review each draw’s rules before purchasing tickets.
          </p>
        </footer>
        <Suspense fallback={null}>
          <FlashToast />
        </Suspense>
        <RegisterSW />
      </body>
    </html>
  );
}
