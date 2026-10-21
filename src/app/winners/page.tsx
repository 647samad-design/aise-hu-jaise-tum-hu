import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { getPublicDraws } from "@/lib/public-draws";
import { getT } from "@/lib/i18n/server";
import { dateText } from "@/lib/i18n/time";

export const metadata: Metadata = { title: "Winners · 1Rupya", alternates: { canonical: "/winners" } };
export const dynamic = "force-dynamic";

export default async function WinnersPage() {
  const [{ draws, unavailable }, t] = await Promise.all([getPublicDraws(true), getT()]);

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">{t("win_eyebrow")}</p>
        <h1>{t("win_h1")}</h1>
        <p>{t("win_p")}</p>
      </header>

      {draws.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="trophy" /></div>
          <h3>{unavailable ? t("win_err_h") : t("win_none_h")}</h3>
          <p>{unavailable ? t("win_err_p") : t("win_none_p")}</p>
          <Link href="/#draws" className="btn-primary">{t("win_open")} <Icon name="arrow" size={18} className="flip-rtl" /></Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {draws.map((d) => (
            <div key={d.id} className="card overflow-hidden">
              <div className="aspect-[16/9] bg-gradient-to-br from-pine-100 to-pine-200">
                {(d.delivery_image || d.image_url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={(d.delivery_image || d.image_url)!} alt={d.title} className="h-full w-full object-cover" loading="lazy" />
                )}
              </div>
              <div className="space-y-3 p-5">
                <p className="font-display text-xl text-pine-900">{d.title}</p>
                {d.delivered_at && <p className="pill pill-green">{t("win_delivered")}</p>}
                <div className="winner-line">
                  <Icon name="trophy" size={18} />
                  <span>{t("win_line", { name: d.winner_label ?? "", n: d.winner_ticket ?? "" })}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-pine-900/60">
                  <span>{t("win_meta", { n: d.target_tickets, date: d.drawn_at ? dateText(t.lang, d.drawn_at) : "" })}</span>
                  <Link href={`/verify/${d.id}`} className="auth-link">{t("win_verify")} <Icon name="arrow" size={14} className="inline flip-rtl" /></Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
