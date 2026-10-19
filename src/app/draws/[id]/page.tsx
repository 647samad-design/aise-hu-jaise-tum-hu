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
import { isUpcoming, longDate, pkr, shortDate, timeAgo, type Draw } from "@/lib/format";
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
    <Link href="/#draws" className="back-link"><Icon name="arrow-left" size={16} /> All draws</Link>
    <div className="mt-4 grid gap-8 md:grid-cols-2">
      <div className="h-fit space-y-5 md:sticky md:top-28">
        <Gallery images={[draw.image_url ?? "", ...(draw.gallery ?? [])]} title={draw.title} />
        {(draw.facts?.length || draw.prize_value) ? (
          <div className="panel">
            <h2 className="panel-title mb-3">Prize details</h2>
            <dl className="facts">
              {draw.prize_value ? <div><dt>Market value</dt><dd>{pkr(draw.prize_value)}</dd></div> : null}
              {(draw.facts ?? []).map((f, n) => {
                const [k, ...v] = f.split(":");
                return v.length ? <div key={n}><dt>{k.trim()}</dt><dd>{v.join(":").trim()}</dd></div> : <div key={n} className="fact-line"><dd>{f}</dd></div>;
              })}
            </dl>
          </div>
        ) : null}
      </div>

      <div className="space-y-5">
        <div>
          <p className="eyebrow">{upcoming ? "COMING SOON" : draw.status === "open" ? "LIVE DRAW" : draw.status === "full" ? "SOLD OUT" : draw.status === "drawn" ? "COMPLETED" : "CANCELLED"}</p>
          <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight text-pine-900">{draw.title}</h1>
          {draw.description && <p className="mt-3 whitespace-pre-line leading-relaxed text-pine-900/75">{draw.description}</p>}
        </div>

        <div className="card space-y-4 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-pine-900/70">Ticket price</span>
            <b className="font-display text-2xl text-pine-800">{pkr(draw.ticket_price)}</b>
          </div>
          <ProgressBar sold={draw.sold_tickets} target={draw.target_tickets} />
          <p className="participants-line">
            <Icon name="user" size={16} /> <b>{(draw.participants ?? 0).toLocaleString()}</b> {draw.participants === 1 ? "person has" : "people have"} joined
          </p>
          <p className="flex justify-between text-sm text-pine-900/70">
            <span>Max {draw.max_per_user} tickets per person</span>
            {draw.ends_at && draw.status === "open" && !upcoming && <Countdown endsAt={draw.ends_at} />}
          </p>

          {upcoming && draw.opens_at && (
            <div className="opens-box">
              <p className="eyebrow">TICKETS OPEN</p>
              <p className="opens-when">{longDate(draw.opens_at)}</p>
              <Countdown endsAt={draw.opens_at} prefix="Opens in" />
              <p className="opens-hint">
                {user
                  ? "You'll get a notification in the app. Top up your wallet now so you're ready the moment it opens."
                  : "Create a free account now so you're ready the moment it opens."}
              </p>
              <Link href={user ? "/wallet" : `/signup?next=/draws/${draw.id}`} className="btn-gold w-full">
                {user ? "Top up wallet" : "Create free account"}
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
              All tickets sold. The winner will be drawn shortly.
            </p>
          )}
          {draw.status === "cancelled" && (
            <p className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">
              This draw was cancelled and every ticket was refunded to wallets.
            </p>
          )}
        </div>

        {draw.status === "drawn" && (
          <div className={`card p-4 ${iWon ? "ring-2 ring-gold-400" : ""}`}>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-600">
              {iWon ? "You won! 🎉" : "Winner"}
            </p>
            <p className="font-display text-2xl font-bold text-pine-900">
              Ticket #{draw.winner_ticket} · {draw.winner_label}
            </p>
            <Link href={`/verify/${draw.id}`} className="mt-2 inline-block text-sm font-semibold text-pine-700 underline">
              Verify this result yourself
            </Link>
          </div>
        )}

        {pending.length > 0 && (
          <Notice tone="info">
            <b>Your payment is being verified.</b>{" "}
            {pending.map((p) => `${p.qty ?? "?"} ticket(s) · ${pkr(p.amount)} · sent ${shortDate(p.created_at)}`).join(" | ")}. You&apos;ll get an
            email and a notification as soon as you&apos;re entered.
          </Notice>
        )}

        {myNumbers.length > 0 && (draw.status === "open" || draw.status === "full") && (
          <Notice tone="success">
            <b>You&apos;re participating in this draw</b> with {myNumbers.length} ticket{myNumbers.length > 1 ? "s" : ""}. We&apos;ll notify you in the app
            when it sells out and when the winner is drawn.
          </Notice>
        )}

        {myNumbers.length > 0 && (
          <div className="card p-4">
            <p className="mb-2 text-sm font-semibold text-pine-900">Your tickets ({myNumbers.length})</p>
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
            <p className="eyebrow">PRIZE DELIVERED</p>
            {draw.delivery_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draw.delivery_image} alt={`${draw.title} handed over to the winner`} loading="lazy" />
            )}
            <p>{draw.delivery_note || "The winner has received this prize."} <span className="text-pine-900/50">· {shortDate(draw.delivered_at)}</span></p>
          </div>
        )}

        {(crowd ?? []).length > 0 && (
          <div className="panel">
            <h2 className="panel-title mb-1">Who has joined</h2>
            <p className="panel-sub !mb-3">Names are partly hidden for privacy. Updated live as payments are verified.</p>
            <ul className="crowd">
              {(crowd ?? []).map((c, n) => (
                <li key={n}>
                  <span className="crowd-avatar">{c.player.slice(0, 1)}</span>
                  <span className="crowd-name">{c.player}</span>
                  <span className="crowd-tix">{c.tickets} ticket{c.tickets > 1 ? "s" : ""}</span>
                  <span className="crowd-time">{timeAgo(c.joined_at)}</span>
                </li>
              ))}
            </ul>
            {(draw.participants ?? 0) > 12 && <p className="mt-2 text-xs text-pine-900/60">+ {(draw.participants ?? 0) - 12} more</p>}
          </div>
        )}

        <ShareButton title={draw.title} text={`Win ${draw.title} with a PKR ${draw.ticket_price} ticket on 1Rupya`} />

        <details className="card p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-pine-800">How is the winner chosen?</summary>
          <p className="mt-2 text-pine-900/75">
            Before the first ticket was sold we published this fingerprint of a secret number:
          </p>
          <code className="mt-1 block break-all rounded-lg bg-pine-50 p-2 text-xs">{draw.seed_hash}</code>
          <p className="mt-2 text-pine-900/75">
            The winner is computed only after all tickets are sold, from that secret number, the final ticket list and
            public randomness. The secret is revealed after the draw so anyone can recompute the result.
          </p>
        </details>
      </div>
    </div>
    </div>
  );
}
