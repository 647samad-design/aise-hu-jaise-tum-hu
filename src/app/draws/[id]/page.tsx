import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import { Countdown, ShareButton } from "@/components/ClientBits";
import { createClient } from "@/lib/supabase/server";
import BuyTickets from "@/components/BuyTickets";
import ProgressBar from "@/components/ProgressBar";
import { getSessionProfile } from "@/lib/auth";
import { pkr, type Draw } from "@/lib/format";

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
      openGraph: { title: data.title, description, images: data.image_url ? [data.image_url] : undefined },
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
  if (user) {
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
  const iWon = draw.status === "drawn" && draw.winner_ticket !== null && myNumbers.includes(draw.winner_ticket);

  return (
    <div className="page">
    <Link href="/#draws" className="back-link"><Icon name="arrow-left" size={16} /> All draws</Link>
    <div className="mt-4 grid gap-8 md:grid-cols-2">
      <div className="card h-fit overflow-hidden md:sticky md:top-28">
        <div className="aspect-[4/3] bg-gradient-to-br from-pine-100 to-pine-200 md:aspect-square">
          {draw.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draw.image_url} alt={draw.title} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center font-display text-9xl text-pine-500/30">1</div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="eyebrow">{draw.status === "open" ? "LIVE DRAW" : draw.status === "full" ? "SOLD OUT" : draw.status === "drawn" ? "COMPLETED" : "CANCELLED"}</p>
          <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight text-pine-900">{draw.title}</h1>
          {draw.description && <p className="mt-3 whitespace-pre-line leading-relaxed text-pine-900/75">{draw.description}</p>}
        </div>

        <div className="card space-y-4 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-pine-900/70">Ticket price</span>
            <b className="font-display text-2xl text-pine-800">{pkr(draw.ticket_price)}</b>
          </div>
          <ProgressBar sold={draw.sold_tickets} target={draw.target_tickets} />
          <p className="flex justify-between text-sm text-pine-900/70">
            <span>Max {draw.max_per_user} tickets per person</span>
            {draw.ends_at && draw.status === "open" && <Countdown endsAt={draw.ends_at} />}
          </p>

          {draw.status === "open" && (
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
