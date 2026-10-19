"use client";

// Shares Chrome's "beforeinstallprompt" event between the install banner and the /download page.
export type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();

export function setInstallEvent(e: InstallEvent | null) {
  deferred = e;
  listeners.forEach((l) => l());
}
export const getInstallEvent = () => deferred;
export function onInstallChange(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  setInstallEvent(null);
  return outcome === "accepted";
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function platform(): "android" | "ios" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document)) return "ios";
  return "desktop";
}
