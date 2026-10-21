import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Link from "next/link";
// Fonts are self-hosted (faster in Pakistan, no Google request). Only the needed weights.
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource/noto-nastaliq-urdu/400.css";
import "@fontsource/noto-nastaliq-urdu/600.css";
import "./globals.css";
import "./ui.css";
import Nav from "@/components/Nav";
import RegisterSW from "@/components/RegisterSW";
import { FlashToast } from "@/components/ClientBits";
import JsonLd from "@/components/JsonLd";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { I18nProvider } from "@/components/I18nProvider";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "1Rupya — Lucky draws from PKR 1 | Win phones & gadgets in Pakistan", template: "%s" },
  description: SITE_DESCRIPTION,
  keywords: ["lucky draw Pakistan", "online lucky draw", "1 rupee lucky draw", "win iPhone Pakistan", "EasyPaisa lucky draw", "JazzCash lucky draw", "1Rupya"],
  creator: SITE_NAME,
  category: "entertainment",
  formatDetection: { telephone: false },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
  manifest: "/manifest.webmanifest",
  applicationName: "1Rupya",
  appleWebApp: { capable: true, title: "1Rupya", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  openGraph: {
    type: "website",
    siteName: "1Rupya",
    title: "1Rupya - Small tickets. Big possibilities.",
    description: "Tickets from PKR 1. Draws run only when every ticket sells, and anyone can verify the winner.",
    locale: "en_PK",
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#103f34",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const support = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
  const t = await getT();
  return (
    <html lang={t.lang} dir={t.lang === "ur" ? "rtl" : "ltr"}>
      <body>
        <I18nProvider lang={t.lang}>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icons/icon-512.png` },
              { "@type": "WebSite", "@id": `${SITE_URL}/#site`, name: SITE_NAME, url: SITE_URL, publisher: { "@id": `${SITE_URL}/#org` }, inLanguage: "en-PK" },
            ],
          }}
        />
        <a href="#main" className="skip-link">{t("skip")}</a>
        <Nav />
        <main id="main" className="site-main">{children}</main>
        <footer className="site-footer">
          <div>
            <Link href="/" className="footer-brand">1Rupya<span>{t("brand_tagline")}</span></Link>
            <p>{t("foot_made")}</p>
          </div>
          <div className="footer-links">
            <Link href="/#draws">{t("nav_draws")}</Link>
            <Link href="/#how-it-works">{t("nav_how")}</Link>
            <Link href="/winners">{t("nav_winners")}</Link>
            <Link href="/#fairness">{t("nav_promise")}</Link>
            <Link href="/terms">{t("foot_terms")}</Link>
            <Link href="/privacy">{t("foot_privacy")}</Link>
            <Link href="/download">{t("nav_app")}</Link>
            {support && <a href={`https://wa.me/${support.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">{t("foot_support")}</a>}
          </div>
          <p className="footer-disclaimer">
            {t("foot_disclaimer")}<br />
            © {new Date().getFullYear()} 1Rupya. {t("foot_rules")}
          </p>
        </footer>
        <Suspense fallback={null}>
          <FlashToast />
        </Suspense>
        <RegisterSW />
        </I18nProvider>
      </body>
    </html>
  );
}
