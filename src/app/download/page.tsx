import type { Metadata } from "next";
import QRCode from "qrcode";
import Icon from "@/components/Icon";
import InstallPanel from "@/components/InstallPanel";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Download the 1Rupya app for Android & iPhone",
  description: "Install 1Rupya on your Android phone or iPhone in one tap. Free, about 1 MB, no Play Store needed. Get draw alerts and buy tickets faster.",
  alternates: { canonical: "/download" },
};

export default async function DownloadPage() {
  const qr = await QRCode.toString(`${SITE_URL}/download`, { type: "svg", margin: 1, color: { dark: "#103f34", light: "#ffffff" } });
  const apk = process.env.NEXT_PUBLIC_ANDROID_APK_URL;

  return (
    <div className="page">
      <section className="dl-hero">
        <div className="dl-copy">
          <p className="eyebrow"><span className="status-dot" /> GET THE APP</p>
          <h1>1Rupya, right on your <em>home screen.</em></h1>
          <p className="dl-lead">
            Opens like an app, loads fast, and shows your tickets, wallet and draw updates in one tap. Free, about 1&nbsp;MB, and no
            Play Store needed.
          </p>
          <InstallPanel apkUrl={apk} />
        </div>
        <div className="dl-phone" aria-hidden="true">
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
          <h2 className="panel-title"><Icon name="android" size={20} className="inline -mt-1 mr-1" /> Android</h2>
          <ol>
            <li>Open this site in <b>Chrome</b>.</li>
            <li>Tap <b>Install app</b> above — or Chrome&apos;s <b>⋮</b> menu → <b>Install app</b> / <b>Add to Home screen</b>.</li>
            <li>Tap <b>Install</b>. 1Rupya appears with your other apps.</li>
          </ol>
        </div>
        <div className="panel">
          <h2 className="panel-title"> iPhone</h2>
          <ol>
            <li>Open this site in <b>Safari</b>.</li>
            <li>Tap the <b>Share</b> button (square with an arrow).</li>
            <li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li>
          </ol>
        </div>
        <div className="panel dl-qr">
          <h2 className="panel-title">On a computer?</h2>
          <p className="panel-sub">Scan with your phone camera to open this page there.</p>
          <div className="qr-svg" dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
      </section>

      <section className="dl-why">
        {[
          ["bell", "Draw alerts", "See the moment your draw sells out, when the winner is picked, and when the next lucky draw opens."],
          ["ticket", "Your tickets, one tap", "No typing the address or hunting for a bookmark."],
          ["shield", "Safe and light", "Needs no special permissions. It is the same secure site, installed by your browser, and always up to date."],
        ].map(([icon, h, p]) => (
          <div key={h}>
            <Icon name={icon as "bell" | "ticket" | "shield"} />
            <h3>{h}</h3>
            <p>{p}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
