"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="status-page">
      <p className="status-code">Oops</p>
      <h1>{t("er_h1a")}<em>{t("er_h1b")}</em></h1>
      <p>{t("er_p")}</p>
      <div className="status-actions">
        <button onClick={reset} className="btn-primary">{t("try_again")}</button>
        <Link href="/" className="btn-ghost">{t("go_home")}</Link>
      </div>
      {error.digest && <p className="status-ref">{t("er_ref", { id: error.digest })}</p>}
    </div>
  );
}
