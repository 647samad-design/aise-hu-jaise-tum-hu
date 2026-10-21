"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useT } from "@/components/I18nProvider";
import { getInstallEvent, isStandalone, onInstallChange, platform, promptInstall } from "@/lib/install";

export default function InstallPanel({ apkUrl }: { apkUrl?: string }) {
  const t = useT();
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
        <p className="dl-installed"><Icon name="check" size={18} /> {t("dl_installed")}</p>
      </div>
    );
  }

  return (
    <div className="dl-actions">
      {os === "ios" ? (
        <p className="dl-ios">{t("dl_ios")}</p>
      ) : (
        <button
          className="btn-gold dl-btn"
          onClick={async () => {
            if (ready) {
              const ok = await promptInstall();
              setMsg(ok ? t("dl_installing") : null);
            } else {
              setMsg(os === "android" ? t("dl_chrome_menu") : t("dl_desktop"));
            }
          }}
        >
          <Icon name="download" size={18} /> {t("dl_install")}
        </button>
      )}
      {apkUrl && (
        <a href={apkUrl} className="btn-ghost dl-btn" download>
          <Icon name="android" size={18} /> {t("dl_apk")}
        </a>
      )}
      {msg && <p className="dl-msg">{msg}</p>}
    </div>
  );
}
