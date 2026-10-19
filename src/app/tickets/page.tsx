import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/components/Icon";
import ProgressBar from "@/components/ProgressBar";
import { getSessionProfile } from "@/lib/auth";
import { pkr, shortDate, type Draw } from "@/lib/format";

export const metadata: Metadata = { title: "My tickets · 1Rupya" };
export const dynamic = "force-dynamic";

type Row = {
  number: number;
  created_at: string;
  draws: Pick<Draw, "id" | "title" | "image_url" | "status" | "winner_ticket" | "ticket_price" | "target_tickets" | "sold_tickets" | "ends_at" | "drawn_at"> | null;
};

const FILTERS = [
  ["all", "All"],
  ["active", "Active"],
  ["won", "Won"],
  ["finished", "Finished"],
] as const;

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

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">YOUR ENTRIES</p>
        <h1>My <em>tickets</em></h1>
        <p>Every ticket you hold, in one place. Results appear here as soon as a draw is completed.</p>
      </header>

      <div className="stat-row">
        <div className="stat"><span>Draws entered</span><strong>{all.length}</strong></div>
        <div className="stat"><span>Tickets held</span><strong>{totalTickets}</strong></div>
        <div className="stat"><span>Spent</span><strong>{pkr(totalSpent)}</strong></div>
        <div className="stat gold"><span>Wins</span><strong>{counts.won}</strong></div>
      </div>

      <div className="chips" role="tablist" aria-label="Filter tickets">
        {FILTERS.map(([key, label]) => (
          <Link key={key} href={key === "all" ? "/tickets" : `/tickets?f=${key}`} role="tab" aria-selected={f === key} className="chip">
            {label} <span>{counts[key]}</span>
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="ticket" /></div>
          <h3>{all.length ? "Nothing in this filter" : "No tickets yet"}</h3>
          <p>{all.length ? "Try another filter." : "Pick an open draw to get your first ticket. Tickets start from PKR 1."}</p>
          <Link href="/#draws" className="btn-primary">Explore draws <Icon name="arrow" size={18} /></Link>
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
                  <Link href={`/draws/${draw.id}`}>{draw.title}</Link>
                  <StatusPill status={draw.status} won={won} />
                </div>
                <p className="ticket-meta">
                  {numbers.length} ticket{numbers.length > 1 ? "s" : ""} · {pkr(numbers.length * draw.ticket_price)} · since {shortDate(first)}
                </p>
                {(draw.status === "open" || draw.status === "full") && (
                  <ProgressBar sold={draw.sold_tickets} target={draw.target_tickets} />
                )}
                {draw.status === "drawn" && (
                  <p className="ticket-result">
                    Winning ticket <b>#{draw.winner_ticket}</b>
                    {won ? " — that's yours! We'll contact you on your registered number." : ""}{" "}
                    <Link href={`/verify/${draw.id}`} className="auth-link">Verify</Link>
                  </p>
                )}
                {draw.status === "cancelled" && <p className="ticket-result">Cancelled — {pkr(numbers.length * draw.ticket_price)} refunded to your wallet.</p>}
                <div className="ticket-numbers">
                  {numbers.slice(0, 40).map((n) => (
                    <span key={n} className={n === draw.winner_ticket ? "win" : ""}>#{n}</span>
                  ))}
                  {numbers.length > 40 && <span className="more">+{numbers.length - 40} more</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status, won }: { status: Draw["status"]; won: boolean }) {
  if (won) return <span className="pill pill-gold">You won</span>;
  const map = { open: ["Live", "pill-green"], full: ["Sold out · drawing soon", "pill-amber"], drawn: ["Completed", "pill-muted"], cancelled: ["Refunded", "pill-red"] } as const;
  const [label, cls] = map[status];
  return <span className={`pill ${cls}`}>{label}</span>;
}
