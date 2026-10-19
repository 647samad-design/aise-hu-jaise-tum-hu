"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { getInstallEvent, isStandalone, onInstallChange, platform, promptInstall } from "@/lib/install";

export default function InstallPanel({ apkUrl }: { apkUrl?: string }) {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [os, setOs] = useState<"android" | "ios" | "desktop">("desktop");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setOs(platform());
    setInstalled(isStandalone());
    setReady(!!getInstallEvent());
    const off = onInstallChange(() => setReady(!!getInstallEvent()));
    const done = () => setInstalled(true);
    window.addEventListener("appinstalled", done);
    return () => {
      off();
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  if (installed) {
    return (
      <div className="dl-actions">
        <p className="dl-installed"><Icon name="check" size={18} /> 1Rupya is installed on this device.</p>
      </div>
    );
  }

  return (
    <div className="dl-actions">
      {os === "ios" ? (
        <p className="dl-ios">On iPhone: tap <b>Share</b> → <b>Add to Home Screen</b> (steps below).</p>
      ) : (
        <button
          className="btn-gold dl-btn"
          onClick={async () => {
            if (ready) {
              const ok = await promptInstall();
              setMsg(ok ? "Installing… find 1Rupya on your home screen." : null);
            } else {
              setMsg(os === "android" ? "Open Chrome's ⋮ menu and tap “Install app” (or “Add to Home screen”)." : "Use the install icon in your browser's address bar, or scan the QR code with your phone.");
            }
          }}
        >
          <Icon name="download" size={18} /> Install app
        </button>
      )}
      {apkUrl && (
        <a href={apkUrl} className="btn-ghost dl-btn" download>
          <Icon name="android" size={18} /> Download APK
        </a>
      )}
      {msg && <p className="dl-msg">{msg}</p>}
    </div>
  );
}
