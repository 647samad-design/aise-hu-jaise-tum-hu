"use client";

import Link from "next/link";
import ProgressBar from "@/components/ProgressBar";
import { Countdown } from "@/components/ClientBits";
import Icon from "@/components/Icon";
import { useT } from "@/components/I18nProvider";
import { isUpcoming, pkr, type Draw } from "@/lib/format";
import { dateText } from "@/lib/i18n/time";

export default function DrawCard({ draw }: { draw: Draw }) {
  const t = useT();
  const left = draw.target_tickets - draw.sold_tickets;
  const upcoming = isUpcoming(draw);

  return (
    <Link href={`/draws/${draw.id}`} className="card draw-card group block overflow-hidden">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-pine-100 to-pine-200">
        {draw.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draw.image_url} alt={draw.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center font-display text-6xl text-pine-500/40">1</div>
        )}
        <span className="card-badge start">{t("per_ticket", { price: pkr(draw.ticket_price) })}</span>
        {upcoming && draw.opens_at && <span className="card-badge end dark">{t("card_coming")}</span>}
        {draw.status === "full" && <span className="card-badge end gold">{t("card_soldout")}</span>}
      </div>
      <div className="space-y-3 p-4">
        {draw.prize_value ? <p className="text-xs font-semibold uppercase tracking-wider text-gold-600">{t("card_worth", { v: pkr(draw.prize_value) })}</p> : null}
        <h3 dir="auto" className="font-display text-xl leading-snug text-pine-900 group-hover:text-pine-700">{draw.title}</h3>
        {upcoming && draw.opens_at ? (
          <p className="opens-line">
            <span suppressHydrationWarning>{t("card_opens", { when: dateText(t.lang, draw.opens_at, true) })}</span>
            <Countdown endsAt={draw.opens_at} prefix="" />
          </p>
        ) : (
          <>
            <ProgressBar sold={draw.sold_tickets} target={draw.target_tickets} />
            <p className="flex flex-wrap items-center justify-between gap-2 text-sm text-pine-900/70">
              <span>
                {left > 0 ? t("card_left", { n: left.toLocaleString() }) : t("card_all_sold")} · {t("card_joined", { n: (draw.participants ?? 0).toLocaleString() })}
              </span>
              {draw.ends_at && draw.status === "open" && <Countdown endsAt={draw.ends_at} />}
            </p>
          </>
        )}
        {draw.status === "open" && !upcoming && (
          <span className="card-cta">
            {t("card_cta")} <Icon name="arrow" size={18} className="flip-rtl" />
          </span>
        )}
      </div>
    </Link>
  );
}
