import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import { Countdown, ShareButton } from "@/components/ClientBits";
import { createClient } from "@/lib/supabase/server";
import JsonLd from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import BuyTickets from "@/components/BuyTickets";
import Gallery from "@/components/Gallery";
import ProgressBar from "@/components/ProgressBar";
import { getSessionProfile } from "@/lib/auth";
import { isUpcoming, pkr, type Draw } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { agoText, dateText } from "@/lib/i18n/time";
import { Notice } from "@/components/auth/fields";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const { data } = await (await createClient()).from("draws").select("title, description, image_url, ticket_price").eq("id", id).single();
    if (!data) return { title: "Draw not found · 1Rupya" };
    const description = `Tickets from PKR ${data.ticket_price}. ${data.description ?? "Provably fair draw on 1Rupya."}`.slice(0, 160);
    return {
      title: `${data.title} · 1Rupya`,
      description,
      alternates: { canonical: `/draws/${id}` },
      openGraph: { title: data.title, description, type: "website", url: `/draws/${id}` },
    };
  } catch {
    return { title: "Draw · 1Rupya" };
  }
}

export default async function DrawPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await getSessionProfile();

  const { data } = await supabase.from("draws").select("*").eq("id", id).single();
  if (!data) notFound();
  const draw = data as Draw;

  let myNumbers: number[] = [];
  let pending: { id: number; amount: number; qty: number | null; created_at: string }[] = [];
  const { data: crowd } = await supabase
    .from("draw_participants_public")
    .select("player, tickets, joined_at")
    .eq("draw_id", id)
    .order("joined_at", { ascending: false })
    .limit(12);
  if (user) {
    const { data: pend } = await supabase
      .from("topups")
      .select("id, amount, qty, created_at")
      .eq("draw_id", id)
      .eq("user_id", user.id)
      .eq("status", "pending");
    pending = pend ?? [];
    const { data: mine } = await supabase
      .from("tickets")
      .select("number")
      .eq("draw_id", id)
      .eq("user_id", user.id)
      .order("number");
    myNumbers = (mine ?? []).map((t) => t.number);
  }

  const left = draw.target_tickets - draw.sold_tickets;
  const maxQty = Math.max(0, Math.min(left, draw.max_per_user - myNumbers.length));
  const upcoming = isUpcoming(draw);
  const t = await getT();
  const iWon = draw.status === "drawn" && draw.winner_ticket !== null && myNumbers.includes(draw.winner_ticket);

  return (
    <div className="page">
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Draws", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: draw.title, item: `${SITE_URL}/draws/${draw.id}` },
        ],
      }}
    />
    <Link href="/#draws" className="back-link"><Icon name="arrow-left" size={16} className="flip-rtl" /> {t("all_draws")}</Link>
    <div className="mt-4 grid gap-8 md:grid-cols-2">
      <div className="h-fit space-y-5 md:sticky md:top-28">
        <Gallery images={[draw.image_url ?? "", ...(draw.gallery ?? [])]} title={draw.title} />
        {(draw.facts?.length || draw.prize_value) ? (
          <div className="panel hidden md:block">
            <h2 className="panel-title mb-3">{t("dp_details")}</h2>
            <dl className="facts">
              {draw.prize_value ? <div><dt>{t("dp_value")}</dt><dd>{pkr(draw.prize_value)}</dd></div> : null}
              {(draw.facts ?? []).map((f, n) => {
                const [k, ...v] = f.split(":");
                return v.length ? <div key={n}><dt dir="auto">{k.trim()}</dt><dd dir="auto">{v.join(":").trim()}</dd></div> : <div key={n} className="fact-line"><dd dir="auto">{f}</dd></div>;
              })}
            </dl>
          </div>
        ) : null}
      </div>

      <div className="space-y-5">
        <div>
          <p className="eyebrow">{t(upcoming ? "dp_coming" : draw.status === "open" ? "dp_live" : draw.status === "full" ? "dp_soldout" : draw.status === "drawn" ? "dp_done" : "dp_cancelled")}</p>
          <h1 dir="auto" className="mt-3 font-display text-4xl leading-tight tracking-tight text-pine-900">{draw.title}</h1>
          {draw.description && <p dir="auto" className="mt-3 whitespace-pre-line leading-relaxed text-pine-900/75">{draw.description}</p>}
        </div>

        <div className="card space-y-4 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-pine-900/70">{t("dp_price")}</span>
            <b className="font-display text-2xl text-pine-800">{pkr(draw.ticket_price)}</b>
          </div>
          <ProgressBar sold={draw.sold_tickets} target={draw.target_tickets} />
          <p className="participants-line">
            <Icon name="user" size={16} /> {draw.participants === 1 ? t("dp_joined_1") : t("dp_joined_n", { n: (draw.participants ?? 0).toLocaleString() })}
          </p>
          <p className="flex justify-between text-sm text-pine-900/70">
            <span>{t("dp_max", { n: draw.max_per_user })}</span>
            {draw.ends_at && draw.status === "open" && !upcoming && <Countdown endsAt={draw.ends_at} />}
          </p>

          {upcoming && draw.opens_at && (
            <div className="opens-box">
              <p className="eyebrow">{t("dp_opens_eyebrow")}</p>
              <p className="opens-when">{dateText(t.lang, draw.opens_at, true)}</p>
              <Countdown endsAt={draw.opens_at} prefix="" />
              <p className="opens-hint">{user ? t("dp_opens_hint_in") : t("dp_opens_hint_out")}</p>
              <Link href={user ? "/wallet" : `/signup?next=/draws/${draw.id}`} className="btn-gold w-full">
                {user ? t("dp_topup") : t("how_cta")}
              </Link>
            </div>
          )}
          {draw.status === "open" && !upcoming && (
            <BuyTickets
              drawId={draw.id}
              price={draw.ticket_price}
              left={left}
              maxQty={maxQty}
              signedIn={!!user}
              hasPhone={!!profile?.phone}
              balance={profile?.balance ?? 0}
              owned={myNumbers.length}
            />
          )}
          {draw.status === "full" && (
            <p className="rounded-xl bg-gold-300/40 p-3 text-center text-sm font-semibold text-gold-600">
              {t("dp_full")}
            </p>
          )}
          {draw.status === "cancelled" && (
            <p className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">
              {t("dp_cancelled_msg")}
            </p>
          )}
        </div>

        {draw.status === "drawn" && (
          <div className={`card p-4 ${iWon ? "ring-2 ring-gold-400" : ""}`}>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-600">
              {iWon ? t("dp_you_won") : t("dp_winner")}
            </p>
            <p className="font-display text-2xl font-bold text-pine-900">
              {t("dp_winner_line", { n: draw.winner_ticket ?? "", name: draw.winner_label ?? "" })}
            </p>
            <Link href={`/verify/${draw.id}`} className="mt-2 inline-block text-sm font-semibold text-pine-700 underline">
              {t("dp_verify")}
            </Link>
          </div>
        )}

        {(draw.facts?.length || draw.prize_value) ? (
          <div className="panel md:hidden">
            <h2 className="panel-title mb-3">{t("dp_details")}</h2>
            <dl className="facts">
              {draw.prize_value ? <div><dt>{t("dp_value")}</dt><dd>{pkr(draw.prize_value)}</dd></div> : null}
              {(draw.facts ?? []).map((f, n) => {
                const [k, ...v] = f.split(":");
                return v.length ? <div key={n}><dt dir="auto">{k.trim()}</dt><dd dir="auto">{v.join(":").trim()}</dd></div> : <div key={n} className="fact-line"><dd dir="auto">{f}</dd></div>;
              })}
            </dl>
          </div>
        ) : null}

        {pending.length > 0 && (
          <Notice tone="info">
            <b>{t("dp_pending_t")}</b>{" "}
            {pending.map((p) => `${t("tickets_n", { n: p.qty ?? "?" })} · ${pkr(p.amount)} · ${dateText(t.lang, p.created_at)}`).join(" | ")}. {t("dp_pending_p")}
          </Notice>
        )}

        {myNumbers.length > 0 && (draw.status === "open" || draw.status === "full") && (
          <Notice tone="success">
            <b>{t("dp_in_t")}</b> {t("dp_in_p", { n: myNumbers.length })}
          </Notice>
        )}

        {myNumbers.length > 0 && (
          <div className="card p-4">
            <p className="mb-2 text-sm font-semibold text-pine-900">{t("dp_your_tickets", { n: myNumbers.length })}</p>
            <div className="flex flex-wrap gap-1.5">
              {myNumbers.map((n) => (
                <span
                  key={n}
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    n === draw.winner_ticket ? "bg-gold-400 text-ink" : "bg-pine-100 text-pine-800"
                  }`}
                >
                  #{n}
                </span>
              ))}
            </div>
          </div>
        )}

        {draw.status === "drawn" && draw.delivered_at && (
          <div className="panel delivered">
            <p className="eyebrow">{t("dp_delivered")}</p>
            {draw.delivery_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draw.delivery_image} alt={`${draw.title} handed over to the winner`} loading="lazy" />
            )}
            <p>{draw.delivery_note || t("dp_delivered_default")} <span className="text-pine-900/50">· {dateText(t.lang, draw.delivered_at)}</span></p>
          </div>
        )}

        {(crowd ?? []).length > 0 && (
          <div className="panel">
            <h2 className="panel-title mb-1">{t("dp_crowd_h")}</h2>
            <p className="panel-sub !mb-3">{t("dp_crowd_p")}</p>
            <ul className="crowd">
              {(crowd ?? []).map((c, n) => (
                <li key={n}>
                  <span className="crowd-avatar">{c.player.slice(0, 1)}</span>
                  <span className="crowd-name" dir="ltr">{c.player}</span>
                  <span className="crowd-tix">{t("tickets_n", { n: c.tickets })}</span>
                  <span className="crowd-time">{agoText(t, t.lang, c.joined_at)}</span>
                </li>
              ))}
            </ul>
            {(draw.participants ?? 0) > 12 && <p className="mt-2 text-xs text-pine-900/60">{t("dp_crowd_more", { n: (draw.participants ?? 0) - 12 })}</p>}
          </div>
        )}

        <ShareButton title={draw.title} text={t("dp_share_text", { title: draw.title, price: draw.ticket_price })} />

        <details className="card p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-pine-800">{t("dp_how_h")}</summary>
          <p className="mt-2 text-pine-900/75">{t("dp_how_1")}</p>
          <code dir="ltr" className="mt-1 block break-all rounded-lg bg-pine-50 p-2 text-xs">{draw.seed_hash}</code>
          <p className="mt-2 text-pine-900/75">{t("dp_how_2")}</p>
        </details>
      </div>
    </div>
    </div>
  );
}
