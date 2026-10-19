import Link from "next/link";
import ProgressBar from "@/components/ProgressBar";
import { pkr, timeLeft, type Draw } from "@/lib/format";

export default function DrawCard({ draw }: { draw: Draw }) {
  const left = Math.max(0, draw.target_tickets - draw.sold_tickets);
  const t = timeLeft(draw.ends_at);

  return (
    <Link href={`/draws/${draw.id}`} className="card group block overflow-hidden transition hover:-translate-y-0.5">
      <div className="relative aspect-[5/4] bg-gradient-to-br from-pine-100 to-pine-200">
        {draw.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draw.image_url} alt={draw.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center font-display text-6xl text-pine-500/40"><span className="text-center"><span className="block text-7xl">↗</span><span className="mt-3 block text-xs tracking-[.2em]">YOUR NEXT POSSIBILITY</span></span></div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-xs font-semibold text-gold-300">
          {pkr(draw.ticket_price)} / ticket
        </span>
        {draw.status === "full" && (
          <span className="absolute right-3 top-3 rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-ink">
            SOLD OUT · drawing soon
          </span>
        )}
      </div>
      <div className="space-y-4 p-5">
        <h3 className="font-display text-lg font-bold leading-snug text-pine-900">{draw.title}</h3>
        <ProgressBar sold={draw.sold_tickets} target={draw.target_tickets} />
        <p className="flex justify-between text-sm text-pine-900/70">
          <span>{left > 0 ? `${left.toLocaleString()} left` : "All tickets sold"}</span>
          {t && <span>{t}</span>}
        </p>
        <span className="flex items-center justify-between border-t border-pine-100 pt-4 text-sm font-semibold text-pine-800">View draw <span aria-hidden="true">↗</span></span>
      </div>
    </Link>
  );
}
