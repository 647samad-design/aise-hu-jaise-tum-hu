import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { redirect } from "next/navigation";
import TopupForm from "@/components/TopupForm";
import { getSessionProfile } from "@/lib/auth";
import { pkr, shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Wallet · 1Rupya", robots: { index: false } };
export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { topup: "Top-up", ticket: "Tickets bought", refund: "Refund", adjust: "Adjustment" };

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gold-300/40 text-gold-600",
  approved: "bg-pine-100 text-pine-800",
  rejected: "bg-red-100 text-red-700",
};

export default async function WalletPage() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user) redirect("/login?next=/wallet");

  const [{ data: topups }, { data: txns }] = await Promise.all([
    supabase.from("topups").select("id, amount, trx_id, status, admin_note, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("wallet_txns").select("id, amount, kind, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(15),
  ]);

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">YOUR MONEY</p>
        <h1>Wallet</h1>
      </header>
      <div className="wallet-grid">
      <div className="space-y-6">
      <section className="balance-card">
        <p className="eyebrow">AVAILABLE BALANCE</p>
        <p className="balance-amount">{pkr(profile?.balance ?? 0)}</p>
        <p className="balance-note">Use it to buy tickets in any open draw. Refunds from cancelled draws land here.</p>
        <div className="balance-actions">
          <a href="#add-money" className="btn-gold">Add money</a>
          <Link href="/#draws" className="balance-link">Browse draws <Icon name="arrow" size={16} /></Link>
        </div>
        {!profile?.phone && (
          <Link href="/profile?welcome=1&next=/wallet" className="balance-warn"><Icon name="alert" size={16} /> Add your phone number to start playing</Link>
        )}
      </section>

      <TopupForm />
      </div>
      <div className="space-y-6">

      <section className="panel">
        <h2 className="panel-title mb-3">Top-up requests</h2>
        {(topups ?? []).length === 0 ? (
          <p className="text-sm text-pine-900/60">No top-ups yet. After you pay, submit the transaction ID and it will appear here.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {topups!.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-semibold">{pkr(t.amount)}</p>
                  <p className="text-xs text-pine-900/60">TRX {t.trx_id} · {shortDate(t.created_at)}</p>
                  {t.admin_note && <p className="text-xs text-pine-900/60">{t.admin_note}</p>}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[t.status]}`}>{t.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2 className="panel-title mb-3">Wallet history</h2>
        {(txns ?? []).length === 0 ? (
          <p className="text-sm text-pine-900/60">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {txns!.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                <span>{KIND[t.kind] ?? t.kind}<span className="ml-2 text-xs text-pine-900/50">{shortDate(t.created_at)}</span></span>
                <span className={t.amount >= 0 ? "font-semibold text-pine-700" : "font-semibold text-red-600"}>
                  {t.amount >= 0 ? "+" : "−"}{pkr(Math.abs(t.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
    </div>
    </div>
  );
}
