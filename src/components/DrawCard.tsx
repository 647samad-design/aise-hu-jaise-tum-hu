import Link from "next/link";
import ProgressBar from "@/components/ProgressBar";
import { pkr, timeLeft, type Draw } from "@/lib/format";

export default function DrawCard({ draw }: { draw: Draw }) {
  const left = draw.target_tickets - draw.sold_tickets;
  const t = timeLeft(draw.ends_at);

  return (
    <Link href={`/draws/${draw.id}`} className="card group block overflow-hidden transition hover:-translate-y-0.5">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-pine-100 to-pine-200">
        {draw.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draw.image_url} alt={draw.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center font-display text-6xl text-pine-500/40">1</div>
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
      <div className="space-y-3 p-4">
        <h3 className="font-display text-lg font-bold leading-snug text-pine-900">{draw.title}</h3>
        <ProgressBar sold={draw.sold_tickets} target={draw.target_tickets} />
        <p className="flex justify-between text-sm text-pine-900/70">
          <span>{left > 0 ? `${left.toLocaleString()} left` : "All tickets sold"}</span>
          {t && <span>{t}</span>}
        </p>
      </div>
    </Link>
  );
}
