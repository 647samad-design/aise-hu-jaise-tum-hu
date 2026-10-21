"use client";

import { useT } from "@/components/I18nProvider";

export default function ProgressBar({ sold, target }: { sold: number; target: number }) {
  const t = useT();
  const pct = Math.min(100, Math.round((sold / target) * 100));
  return (
    <div>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 flex justify-between text-xs font-medium text-pine-900/70">
        <span>{t("prog_sold", { sold: sold.toLocaleString(), target: target.toLocaleString() })}</span>
        <span>{pct}%</span>
      </p>
    </div>
  );
}
