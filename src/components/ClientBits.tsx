"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { useT } from "@/components/I18nProvider";
import type { Key } from "@/lib/i18n/messages";
import { leftText } from "@/lib/i18n/time";

/** Ticks every 30s so "2h 14m left" stays accurate without reloading. `prefix` shows "Opens in 2d 3h". */
export function Countdown({ endsAt, className = "", prefix }: { endsAt: string; className?: string; prefix?: string }) {
  const t = useT();
  const fmt = () => {
    if (prefix === undefined) return leftText(t, endsAt);
    const x = leftText(t, endsAt, "in");
    return prefix ? `${prefix} ${x}` : x;
  };
  const [text, setText] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setText(fmt()), 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);
  const urgent = new Date(endsAt).getTime() - Date.now() < 86_400_000;
  return (
    <span className={`countdown ${urgent ? "urgent" : ""} ${className}`} suppressHydrationWarning>
      <Icon name="clock" size={15} /> {text}
    </span>
  );
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  const t = useT();
  label = label ?? t("copy");
  return (
    <button
      type="button"
      className="copy-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard blocked */
        }
      }}
      aria-label={`${label} ${value}`}
    >
      <Icon name={done ? "check" : "copy"} size={15} /> {done ? t("copied") : label}
    </button>
  );
}

export function ShareButton({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const t = useT();
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        return; // user closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener");
    }
  }
  return (
    <div className="share-row">
      <button type="button" onClick={share} className="btn-ghost !py-2">
        <Icon name={copied ? "check" : "share"} size={17} /> {copied ? t("link_copied") : t("share")}
      </button>
      <a
        className="btn-whatsapp !py-2"
        target="_blank"
        rel="noopener noreferrer"
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        onClick={(e) => {
          e.currentTarget.href = `https://wa.me/?text=${encodeURIComponent(`${text} ${window.location.href}`)}`;
        }}
      >
        {t("whatsapp")}
      </a>
    </div>
  );
}

const FLASH: Record<string, Key> = {
  "welcome=1": "toast_welcome",
  "password=updated": "toast_pw",
  "signedout=1": "toast_out",
};

/** Small toast for one-off messages passed as ?query flags after redirects. */
export function FlashToast() {
  const params = useSearchParams();
  const path = usePathname();
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    if (path === "/profile" || path === "/login") return; // those pages show their own banner
    const hit = Object.keys(FLASH).find((k) => {
      const [key, val] = k.split("=");
      return params.get(key!) === val;
    });
    if (!hit) return;
    setMsg(t(FLASH[hit]!));
    const clean = new URLSearchParams(params.toString());
    clean.delete(hit.split("=")[0]!);
    const qs = clean.toString();
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, path, router]);

  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(null), 4500);
    return () => clearTimeout(id);
  }, [msg]);

  if (!msg) return null;
  return (
    <div className="toast" role="status">
      <Icon name="check" size={18} /> {msg}
      <button aria-label={t("dismiss")} onClick={() => setMsg(null)}>×</button>
    </div>
  );
}
