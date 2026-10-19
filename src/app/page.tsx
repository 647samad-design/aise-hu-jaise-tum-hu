import Link from "next/link";
import DrawCard from "@/components/DrawCard";
import { createClient } from "@/lib/supabase/server";
import type { Draw } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("draws")
    .select("*")
    .in("status", ["open", "full"])
    .order("created_at", { ascending: false });
  const draws = (data ?? []) as Draw[];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-pine-800 to-ink p-6 text-white shadow-card sm:p-10">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-gold-300">Tiny ticket · real prize</p>
        <h1 className="font-display text-3xl font-bold leading-tight sm:text-5xl">
          Win a gadget for <span className="text-gold-400">PKR 1</span>.
        </h1>
        <p className="mt-3 max-w-xl text-pine-100/90">
          Every draw only runs when <b>every ticket is sold</b>. The winner is picked by a public formula
          that anyone can re-check. No hand-picked winners, ever.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#draws" className="btn-gold">See live draws</a>
          <Link href="/winners" className="btn bg-white/10 text-white hover:bg-white/20">Past winners</Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["1. Top up", "Add PKR 50+ to your wallet via EasyPaisa or JazzCash."],
          ["2. Buy tickets", "Spend PKR 1-2 per ticket. Your numbers appear instantly."],
          ["3. Fair draw", "When the last ticket sells, the winner is drawn and proven publicly."],
        ].map(([t, d]) => (
          <div key={t} className="card p-4">
            <p className="font-display text-lg font-bold text-pine-800">{t}</p>
            <p className="mt-1 text-sm text-pine-900/70">{d}</p>
          </div>
        ))}
      </section>

      <section id="draws" className="scroll-mt-20">
        <h2 className="mb-4 font-display text-2xl font-bold text-pine-900">Live draws</h2>
        {draws.length === 0 ? (
          <div className="card p-8 text-center text-pine-900/70">
            No draws are open right now. Check back soon.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {draws.map((d) => (
              <DrawCard key={d.id} draw={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
