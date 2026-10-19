import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "1Rupya - Win gadgets for PKR 1",
  description: "Tiny tickets, real prizes. Every draw is provably fair and the winner is chosen only when every ticket is sold.",
  manifest: "/manifest.webmanifest",
  applicationName: "1Rupya",
  appleWebApp: { capable: true, title: "1Rupya", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0b3724",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-24 pt-6 text-center text-xs text-pine-900/60">
          <p>
            1Rupya · 18+ only · Winners are picked by a public, verifiable formula, never by hand.
          </p>
        </footer>
        <RegisterSW />
      </body>
    </html>
  );
}
