"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Registers the service worker and shows an "Add 1Rupya to Home Screen" banner.
export default function RegisterSW() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    try {
      if (localStorage.getItem("hide-install") === "1") setHidden(true);
    } catch {
      /* storage unavailable */
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!installEvent || hidden) return null;

  return (
    <div className="install-banner fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-pine-900 p-3 text-white shadow-card">
      <div className="flex-1 text-sm">
        <p className="font-semibold">Add 1Rupya to Home Screen</p>
        <p className="text-pine-100/80">Open it like an app, one tap.</p>
      </div>
      <button
        className="btn-gold !px-4 !py-2"
        onClick={async () => {
          await installEvent.prompt();
          setInstallEvent(null);
        }}
      >
        Install
      </button>
      <button
        aria-label="Dismiss"
        className="px-2 text-xl leading-none text-white/70"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem("hide-install", "1");
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
