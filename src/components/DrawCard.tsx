import Link from "next/link";
import ProgressBar from "@/components/ProgressBar";
import { Countdown } from "@/components/ClientBits";
import { isUpcoming, longDate, pkr, type Draw } from "@/lib/format";

export default function DrawCard({ draw }: { draw: Draw }) {
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
        <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-xs font-semibold text-gold-300">
          {pkr(draw.ticket_price)} / ticket
        </span>
        {upcoming && draw.opens_at && (
          <span className="absolute right-3 top-3 rounded-full bg-pine-900 px-3 py-1 text-xs font-bold text-gold-300">
            COMING SOON
          </span>
        )}
        {draw.status === "full" && (
          <span className="absolute right-3 top-3 rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-ink">
            SOLD OUT · drawing soon
          </span>
        )}
      </div>
      <div className="space-y-3 p-4">
        <h3 className="font-display text-xl leading-snug text-pine-900 group-hover:text-pine-700">{draw.title}</h3>
        {upcoming && draw.opens_at ? (
          <p className="opens-line">
            <span>Tickets open {longDate(draw.opens_at)}</span>
            <Countdown endsAt={draw.opens_at} prefix="in" />
          </p>
        ) : (
          <>
            <ProgressBar sold={draw.sold_tickets} target={draw.target_tickets} />
            <p className="flex items-center justify-between text-sm text-pine-900/70">
              <span>{left > 0 ? `${left.toLocaleString()} left` : "All tickets sold"}</span>
              {draw.ends_at && draw.status === "open" && <Countdown endsAt={draw.ends_at} />}
            </p>
          </>
        )}
      </div>
    </Link>
  );
}
