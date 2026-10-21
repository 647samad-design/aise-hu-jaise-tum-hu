"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleLogo } from "@/components/Icon";
import { useT } from "@/components/I18nProvider";

export default function GoogleButton({ next = "/", label }: { next?: string; label?: string }) {
  const t = useT();
  label = label ?? t("au_google");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setError(error.message.includes("not enabled") ? t("au_google_off") : error.message);
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={go} disabled={busy} className="btn-oauth w-full">
        {busy ? <span className="spinner dark" aria-hidden="true" /> : <GoogleLogo />}
        {busy ? t("au_google_opening") : label}
      </button>
      {error && <p className="field-error mt-2 text-center">{error}</p>}
    </>
  );
}
