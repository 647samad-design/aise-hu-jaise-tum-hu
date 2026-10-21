import type { Metadata } from "next";
import QRCode from "qrcode";
import Icon from "@/components/Icon";
import InstallPanel from "@/components/InstallPanel";
import { SITE_URL } from "@/lib/site";
import { getT } from "@/lib/i18n/server";
import type { Key } from "@/lib/i18n/messages";

export const metadata: Metadata = {
  title: "Download the 1Rupya app for Android & iPhone",
  description: "Install 1Rupya on your Android phone or iPhone in one tap. Free, about 1 MB, no Play Store needed. Get draw alerts and buy tickets faster.",
  alternates: { canonical: "/download" },
};

export default async function DownloadPage() {
  const qr = await QRCode.toString(`${SITE_URL}/download`, { type: "svg", margin: 1, color: { dark: "#103f34", light: "#ffffff" } });
  const apk = process.env.NEXT_PUBLIC_ANDROID_APK_URL;
  const t = await getT();

  return (
    <div className="page">
      <section className="dl-hero">
        <div className="dl-copy">
          <p className="eyebrow"><span className="status-dot" /> {t("dl_eyebrow")}</p>
          <h1>{t("dl_h1a")}<em>{t("dl_h1b")}</em></h1>
          <p className="dl-lead">{t("dl_lead")}</p>
          <InstallPanel apkUrl={apk} />
        </div>
        <div className="dl-phone" aria-hidden="true" dir="ltr">
          <div className="phone">
            <div className="phone-notch" />
            <div className="phone-screen">
              <div className="ps-head"><span className="brand-mark sm">1</span> Rupya <span className="ps-bal">PKR 250</span></div>
              <div className="ps-card"><span className="ps-tag">LIVE</span><b>Samsung A15</b><span className="ps-bar"><i style={{ width: "72%" }} /></span><small>720 / 1,000 sold</small></div>
              <div className="ps-note"><Icon name="bell" size={14} /> You&apos;re in! Tickets #212–#216</div>
              <div className="ps-note gold"><Icon name="spark" size={14} /> Next draw opens Fri 9 PM</div>
            </div>
          </div>
        </div>
      </section>

      <section className="dl-steps">
        <div className="panel">
          <h2 className="panel-title"><Icon name="android" size={20} className="inline -mt-1 me-1" /> {t("dl_android")}</h2>
          <ol>
            <li>{t("dl_a1")}</li>
            <li>{t("dl_a2")}</li>
            <li>{t("dl_a3")}</li>
          </ol>
        </div>
        <div className="panel">
          <h2 className="panel-title"> {t("dl_iphone")}</h2>
          <ol>
            <li>{t("dl_i1")}</li>
            <li>{t("dl_i2")}</li>
            <li>{t("dl_i3")}</li>
          </ol>
        </div>
        <div className="panel dl-qr">
          <h2 className="panel-title">{t("dl_pc")}</h2>
          <p className="panel-sub">{t("dl_pc_p")}</p>
          <div className="qr-svg" dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
      </section>

      <section className="dl-why">
        {([
          ["bell", "dl_w1t", "dl_w1p"],
          ["ticket", "dl_w2t", "dl_w2p"],
          ["shield", "dl_w3t", "dl_w3p"],
        ] as [string, Key, Key][]).map(([icon, h, p]) => (
          <div key={h}>
            <Icon name={icon as "bell" | "ticket" | "shield"} />
            <h3>{t(h)}</h3>
            <p>{t(p)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
