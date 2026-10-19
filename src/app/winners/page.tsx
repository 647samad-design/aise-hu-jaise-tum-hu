import Link from "next/link";
import { getPublicDraws } from "@/lib/public-draws";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function WinnersPage() {
  const { draws, unavailable } = await getPublicDraws(true);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-pine-800">Winners</h1>
        <p className="text-sm text-pine-900/70">Every result below can be verified by anyone.</p>
      </div>

      {draws.length === 0 ? (
        <div className="card p-8 text-center text-pine-900/70">{unavailable ? "Results are temporarily unavailable. Please try again shortly." : "No draws have been completed yet. Published results will appear here."}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {draws.map((d) => (
            <div key={d.id} className="card overflow-hidden">
              <div className="aspect-[16/9] bg-gradient-to-br from-pine-100 to-pine-200">
                {d.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.image_url} alt={d.title} className="h-full w-full object-cover" loading="lazy" />
                )}
              </div>
              <div className="space-y-1 p-4">
                <p className="font-display text-lg font-bold text-pine-900">{d.title}</p>
                <p className="text-sm">
                  <b>{d.winner_label}</b> · ticket #{d.winner_ticket}
                </p>
                <p className="text-xs text-pine-900/60">{d.drawn_at ? shortDate(d.drawn_at) : ""}</p>
                <Link href={`/verify/${d.id}`} className="text-sm font-semibold text-pine-700 underline">
                  Verify result
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
