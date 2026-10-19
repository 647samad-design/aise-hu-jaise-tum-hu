import Link from "next/link";
import { notFound } from "next/navigation";
import BuyTickets from "@/components/BuyTickets";
import ProgressBar from "@/components/ProgressBar";
import { getSessionProfile } from "@/lib/auth";
import { pkr, timeLeft, type Draw } from "@/lib/format";

export const dynamic = "force-dynamic";

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
  const t = timeLeft(draw.ends_at);
  const iWon = draw.status === "drawn" && draw.winner_ticket !== null && myNumbers.includes(draw.winner_ticket);

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      <div className="card overflow-hidden">
        <div className="aspect-square bg-gradient-to-br from-pine-100 to-pine-200">
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
          <h1 className="font-display text-3xl font-bold leading-tight text-pine-900">{draw.title}</h1>
          {draw.description && <p className="mt-2 text-pine-900/75">{draw.description}</p>}
        </div>

        <div className="card space-y-4 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-pine-900/70">Ticket price</span>
            <b className="font-display text-2xl text-pine-800">{pkr(draw.ticket_price)}</b>
          </div>
          <ProgressBar sold={draw.sold_tickets} target={draw.target_tickets} />
          <p className="flex justify-between text-sm text-pine-900/70">
            <span>Max {draw.max_per_user} tickets per person</span>
            {t && draw.status === "open" && <span>{t}</span>}
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
  );
}
