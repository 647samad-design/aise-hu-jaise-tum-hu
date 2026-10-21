"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useT } from "@/components/I18nProvider";
import { LANG_COOKIE } from "@/lib/i18n/types";

/** Switches the whole site between اردو and English (remembered for a year). */
export default function LangToggle({ className = "" }: { className?: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = t.lang === "ur" ? "en" : "ur";
  return (
    <button
      type="button"
      className={`lang-toggle ${className}`}
      disabled={pending}
      lang={next}
      aria-label={next === "en" ? "Switch to English" : "اردو میں دیکھیں"}
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        start(() => router.refresh());
      }}
    >
      {next === "en" ? "English" : "اردو"}
    </button>
  );
}
