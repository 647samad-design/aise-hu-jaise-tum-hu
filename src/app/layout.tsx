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
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <div><a href="/" className="footer-brand">1Rupya<span>Small tickets. Big possibilities.</span></a><p>Made for possibility. Built on transparency.</p></div>
          <div className="footer-links"><a href="/#draws">Explore draws</a><a href="/winners">Past results</a><a href="/#fairness">Fairness & rules</a></div>
          <p className="footer-disclaimer">18+ only · Participation does not guarantee a prize.<br />Review each draw’s rules before purchasing tickets.</p>
        </footer>
        <RegisterSW />
      </body>
    </html>
  );
}
