import type { Key } from "@/lib/i18n/messages";
import type { Lang } from "@/lib/i18n/types";

type T = (key: Key, vars?: Record<string, string | number>) => string;

/** "2 دن 3 گھنٹے باقی" / "in 2d 3h" (mode "in") — null when there is no date. */
export function leftText(t: T, iso: string | null, mode: "left" | "in" = "left"): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return t("t_ended");
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (mode === "in") return d > 0 ? t("t_in_d", { d, h }) : h > 0 ? t("t_in_h", { h, m }) : t("t_in_m", { m });
  return d > 0 ? t("t_left_d", { d, h }) : h > 0 ? t("t_left_h", { h, m }) : t("t_left_m", { m });
}

export function agoText(t: T, lang: Lang, iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t("ago_now");
  if (s < 3600) return t("ago_m", { n: Math.floor(s / 60) });
  if (s < 86400) return t("ago_h", { n: Math.floor(s / 3600) });
  if (s < 604800) return t("ago_d", { n: Math.floor(s / 86400) });
  return dateText(lang, iso);
}

/** Dates always in Pakistan time, Urdu or English month names, Western digits. */
export function dateText(lang: Lang, iso: string, long = false): string {
  return new Date(iso).toLocaleString(lang === "ur" ? "ur-PK-u-nu-latn" : "en-PK", {
    ...(long ? { weekday: "short" } : {}),
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
}
