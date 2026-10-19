import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { getPublicDraws } from "@/lib/public-draws";
import { shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Winners · 1Rupya", alternates: { canonical: "/winners" } };
export const dynamic = "force-dynamic";

export default async function WinnersPage() {
  const { draws, unavailable } = await getPublicDraws(true);

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">PUBLISHED RESULTS</p>
        <h1>Past <em>winners</em></h1>
        <p>Every result below comes with its full proof. Open any one and recompute the winning ticket in your own browser.</p>
      </header>

      {draws.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="trophy" /></div>
          <h3>{unavailable ? "Results are temporarily unavailable" : "No completed draws yet"}</h3>
          <p>{unavailable ? "Please try again shortly." : "Published results and their proofs will appear here as soon as the first draw completes."}</p>
          <Link href="/#draws" className="btn-primary">Explore open draws <Icon name="arrow" size={18} /></Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {draws.map((d) => (
            <div key={d.id} className="card overflow-hidden">
              <div className="aspect-[16/9] bg-gradient-to-br from-pine-100 to-pine-200">
                {(d.delivery_image || d.image_url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={(d.delivery_image || d.image_url)!} alt={d.delivery_image ? `${d.title} handed over to the winner` : d.title} className="h-full w-full object-cover" loading="lazy" />
                )}
              </div>
              <div className="space-y-3 p-5">
                <p className="font-display text-xl text-pine-900">{d.title}</p>
                {d.delivered_at && <p className="pill pill-green">✓ Prize delivered</p>}
                <div className="winner-line">
                  <Icon name="trophy" size={18} />
                  <span><b>{d.winner_label}</b> won with ticket <b>#{d.winner_ticket}</b></span>
                </div>
                <div className="flex items-center justify-between text-xs text-pine-900/60">
                  <span>{d.target_tickets} tickets · {d.drawn_at ? shortDate(d.drawn_at) : ""}</span>
                  <Link href={`/verify/${d.id}`} className="auth-link">Verify <Icon name="arrow" size={14} className="inline" /></Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
