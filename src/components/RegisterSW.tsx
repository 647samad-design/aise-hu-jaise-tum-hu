"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isStandalone, onInstallChange, getInstallEvent, promptInstall, setInstallEvent, type InstallEvent } from "@/lib/install";

// Registers the service worker and shows an "Install 1Rupya" banner on phones.
export default function RegisterSW() {
  const [canInstall, setCanInstall] = useState(false);
  const [hidden, setHidden] = useState(true);
  const path = usePathname();

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const off = onInstallChange(() => setCanInstall(!!getInstallEvent()));
    try {
      // Ask again a week after "not now".
      const t = Number(localStorage.getItem("hide-install-at") || 0);
      setHidden(isStandalone() || Date.now() - t < 7 * 86_400_000);
    } catch {
      setHidden(isStandalone());
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      off();
    };
  }, []);

  if (!canInstall || hidden || path === "/download") return null;

  return (
    <div className="install-banner fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-pine-900 p-3 text-white shadow-card">
      <img src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">Get the 1Rupya app</p>
        <p className="text-white/70">Free · 1 tap · no Play Store needed. <Link href="/download" className="underline">How?</Link></p>
      </div>
      <button className="btn-gold !px-4 !py-2" onClick={() => void promptInstall()}>
        Install
      </button>
      <button
        aria-label="Not now"
        className="px-2 text-xl leading-none text-white/70"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem("hide-install-at", String(Date.now()));
          } catch {
            /* ignore */
          }
        }}
      >
        ×
      </button>
    </div>
  );
}
