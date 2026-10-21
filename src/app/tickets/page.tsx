import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/components/Icon";
import ProgressBar from "@/components/ProgressBar";
import { getSessionProfile } from "@/lib/auth";
import { pkr, type Draw } from "@/lib/format";
import type { Key } from "@/lib/i18n/messages";
import { getT } from "@/lib/i18n/server";
import { dateText } from "@/lib/i18n/time";

export const metadata: Metadata = { title: "My tickets · 1Rupya", robots: { index: false } };
export const dynamic = "force-dynamic";

type Row = {
  number: number;
  created_at: string;
  draws: Pick<Draw, "id" | "title" | "image_url" | "status" | "winner_ticket" | "ticket_price" | "target_tickets" | "sold_tickets" | "ends_at" | "drawn_at"> | null;
};

const FILTERS = [
  ["all", "mt_f_all"],
  ["active", "mt_f_active"],
  ["won", "mt_f_won"],
  ["finished", "mt_f_done"],
] as const satisfies readonly (readonly [string, Key])[];

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f = "all" } = await searchParams;
  const { supabase, user } = await getSessionProfile();
  if (!user) redirect("/login?next=/tickets");

  const { data } = await supabase
    .from("tickets")
    .select("number, created_at, draws(id, title, image_url, status, winner_ticket, ticket_price, target_tickets, sold_tickets, ends_at, drawn_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1000);

  // Group ticket numbers by draw.
  const groups = new Map<string, { draw: NonNullable<Row["draws"]>; numbers: number[]; first: string }>();
  for (const r of (data ?? []) as unknown as Row[]) {
    if (!r.draws) continue;
    const g = groups.get(r.draws.id) ?? { draw: r.draws, numbers: [], first: r.created_at };
    g.numbers.push(r.number);
    groups.set(r.draws.id, g);
  }
  const all = [...groups.values()].map((g) => ({
    ...g,
    numbers: g.numbers.sort((a, b) => a - b),
    won: g.draw.status === "drawn" && g.draw.winner_ticket !== null && g.numbers.includes(g.draw.winner_ticket),
  }));

  const counts = {
    all: all.length,
    active: all.filter((g) => g.draw.status === "open" || g.draw.status === "full").length,
    won: all.filter((g) => g.won).length,
    finished: all.filter((g) => g.draw.status === "drawn" || g.draw.status === "cancelled").length,
  };
  const list = all.filter((g) =>
    f === "active" ? g.draw.status === "open" || g.draw.status === "full"
    : f === "won" ? g.won
    : f === "finished" ? g.draw.status === "drawn" || g.draw.status === "cancelled"
    : true,
  );
  const totalTickets = all.reduce((s, g) => s + g.numbers.length, 0);
  const totalSpent = all.filter((g) => g.draw.status !== "cancelled").reduce((s, g) => s + g.numbers.length * g.draw.ticket_price, 0);

  const t = await getT();
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">{t("mt_eyebrow")}</p>
        <h1>{t("mt_h1")}</h1>
        <p>{t("mt_p")}</p>
      </header>

      <div className="stat-row">
        <div className="stat"><span>{t("mt_entered")}</span><strong>{all.length}</strong></div>
        <div className="stat"><span>{t("mt_held")}</span><strong>{totalTickets}</strong></div>
        <div className="stat"><span>{t("mt_spent")}</span><strong dir="ltr">{pkr(totalSpent)}</strong></div>
        <div className="stat gold"><span>{t("mt_wins")}</span><strong>{counts.won}</strong></div>
      </div>

      <div className="chips" role="tablist" aria-label={t("mt_h1")}>
        {FILTERS.map(([key, label]) => (
          <Link key={key} href={key === "all" ? "/tickets" : `/tickets?f=${key}`} role="tab" aria-selected={f === key} className="chip">
            {t(label)} <span>{counts[key]}</span>
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="ticket" /></div>
          <h3>{all.length ? t("mt_empty_filter_h") : t("mt_none_h")}</h3>
          <p>{all.length ? t("mt_empty_filter_p") : t("mt_none_p")}</p>
          <Link href="/#draws" className="btn-primary">{t("mt_explore")} <Icon name="arrow" size={18} className="flip-rtl" /></Link>
        </div>
      ) : (
        <ul className="ticket-list">
          {list.map(({ draw, numbers, won, first }) => (
            <li key={draw.id} className={`ticket-row ${won ? "won" : ""}`}>
              <Link href={`/draws/${draw.id}`} className="ticket-thumb">
                {draw.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draw.image_url} alt="" loading="lazy" />
                ) : (
                  <span>1</span>
                )}
              </Link>
              <div className="ticket-main">
                <div className="ticket-title">
                  <Link href={`/draws/${draw.id}`} dir="auto">{draw.title}</Link>
                  <StatusPill status={draw.status} won={won} t={t} />
                </div>
                <p className="ticket-meta">
                  {t("mt_meta", { n: numbers.length, amount: pkr(numbers.length * draw.ticket_price), date: dateText(t.lang, first) })}
                </p>
                {(draw.status === "open" || draw.status === "full") && (
                  <ProgressBar sold={draw.sold_tickets} target={draw.target_tickets} />
                )}
                {draw.status === "drawn" && (
                  <p className="ticket-result">
                    <b>{t("mt_win_line", { n: draw.winner_ticket ?? "" })}</b>
                    {won ? t("mt_yours") : ""}{" "}
                    <Link href={`/verify/${draw.id}`} className="auth-link">{t("mt_verify")}</Link>
                  </p>
                )}
                {draw.status === "cancelled" && <p className="ticket-result">{t("mt_refunded", { amount: pkr(numbers.length * draw.ticket_price) })}</p>}
                <div className="ticket-numbers" dir="ltr">
                  {numbers.slice(0, 40).map((n) => (
                    <span key={n} className={n === draw.winner_ticket ? "win" : ""}>#{n}</span>
                  ))}
                  {numbers.length > 40 && <span className="more">{t("mt_more", { n: numbers.length - 40 })}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status, won, t }: { status: Draw["status"]; won: boolean; t: Awaited<ReturnType<typeof getT>> }) {
  if (won) return <span className="pill pill-gold">{t("pill_won")}</span>;
  const map = { open: ["pill_live", "pill-green"], full: ["pill_full", "pill-amber"], drawn: ["pill_done", "pill-muted"], cancelled: ["pill_refunded", "pill-red"] } as const;
  const [label, cls] = map[status];
  return <span className={`pill ${cls}`}>{t(label)}</span>;
}
