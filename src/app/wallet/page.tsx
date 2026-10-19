import Link from "next/link";
import { redirect } from "next/navigation";
import TopupForm from "@/components/TopupForm";
import { getSessionProfile } from "@/lib/auth";
import { pkr, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gold-300/40 text-gold-600",
  approved: "bg-pine-100 text-pine-800",
  rejected: "bg-red-100 text-red-700",
};

export default async function WalletPage() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user) redirect("/login");

  const [{ data: topups }, { data: txns }] = await Promise.all([
    supabase.from("topups").select("id, amount, trx_id, status, admin_note, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("wallet_txns").select("id, amount, kind, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(15),
  ]);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <section className="rounded-3xl bg-gradient-to-br from-pine-800 to-ink p-6 text-white shadow-card">
        <p className="text-sm text-pine-100/80">Wallet balance</p>
        <p className="font-display text-5xl font-bold text-gold-400">{pkr(profile?.balance ?? 0)}</p>
        {!profile?.phone && (
          <Link href="/profile" className="btn-gold mt-4">Complete your profile to start playing</Link>
        )}
      </section>

      <TopupForm />

      <section className="card p-5">
        <h2 className="mb-3 font-display text-xl font-bold text-pine-800">Your top-ups</h2>
        {(topups ?? []).length === 0 ? (
          <p className="text-sm text-pine-900/60">No top-ups yet.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {topups!.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-semibold">{pkr(t.amount)}</p>
                  <p className="text-xs text-pine-900/60">TRX {t.trx_id} · {shortDate(t.created_at)}</p>
                  {t.admin_note && <p className="text-xs text-pine-900/60">{t.admin_note}</p>}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[t.status]}`}>{t.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-display text-xl font-bold text-pine-800">Wallet history</h2>
        {(txns ?? []).length === 0 ? (
          <p className="text-sm text-pine-900/60">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {txns!.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="capitalize">{t.kind}<span className="ml-2 text-xs text-pine-900/50">{shortDate(t.created_at)}</span></span>
                <span className={t.amount >= 0 ? "font-semibold text-pine-700" : "font-semibold text-red-600"}>
                  {t.amount >= 0 ? "+" : ""}{t.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
