"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import { timeLeft } from "@/lib/format";

/** Ticks every 30s so "2h 14m left" stays accurate without reloading. */
export function Countdown({ endsAt, className = "", prefix }: { endsAt: string; className?: string; prefix?: string }) {
  const fmt = () => {
    const t = timeLeft(endsAt);
    return prefix && t ? `${prefix} ${t.replace(/ left$/, "")}` : t;
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

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
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
      <Icon name={done ? "check" : "copy"} size={15} /> {done ? "Copied" : label}
    </button>
  );
}

export function ShareButton({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
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
        <Icon name={copied ? "check" : "share"} size={17} /> {copied ? "Link copied" : "Share"}
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
        WhatsApp
      </a>
    </div>
  );
}

const FLASH: Record<string, string> = {
  "welcome=1": "Welcome to 1Rupya! Your account is ready.",
  "password=updated": "Your password was updated.",
  "signedout=1": "You have been signed out.",
};

/** Small toast for one-off messages passed as ?query flags after redirects. */
export function FlashToast() {
  const params = useSearchParams();
  const path = usePathname();
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (path === "/profile" || path === "/login") return; // those pages show their own banner
    const hit = Object.keys(FLASH).find((k) => {
      const [key, val] = k.split("=");
      return params.get(key!) === val;
    });
    if (!hit) return;
    setMsg(FLASH[hit]!);
    const clean = new URLSearchParams(params.toString());
    clean.delete(hit.split("=")[0]!);
    const qs = clean.toString();
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
  }, [params, path, router]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4500);
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) return null;
  return (
    <div className="toast" role="status">
      <Icon name="check" size={18} /> {msg}
      <button aria-label="Dismiss" onClick={() => setMsg(null)}>×</button>
    </div>
  );
}
