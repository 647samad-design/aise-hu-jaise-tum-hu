import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/components/Icon";
import PaymentForm from "@/components/PaymentForm";
import { getSessionProfile } from "@/lib/auth";
import { pkr } from "@/lib/format";
import type { Key } from "@/lib/i18n/messages";
import { getT } from "@/lib/i18n/server";
import { dateText } from "@/lib/i18n/time";
import { getPaySettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Wallet · 1Rupya", robots: { index: false } };
export const dynamic = "force-dynamic";

const KIND: Record<string, Key> = { topup: "w_kind_topup", ticket: "w_kind_ticket", refund: "w_kind_refund", adjust: "w_kind_adjust" };
const STATUS: Record<string, [Key, string]> = {
  pending: ["w_status_pending", "pill-amber"],
  approved: ["w_status_approved", "pill-green"],
  rejected: ["w_status_rejected", "pill-red"],
};

type Topup = {
  id: number;
  amount: number;
  trx_id: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  qty: number | null;
  result: string | null;
  draws: { id: string; title: string } | null;
};

export default async function WalletPage() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user) redirect("/login?next=/wallet");

  const [{ data: topups }, { data: txns }, settings, t] = await Promise.all([
    supabase.from("topups").select("id, amount, trx_id, status, admin_note, created_at, qty, result, draws(id, title)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("wallet_txns").select("id, amount, kind, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(15),
    getPaySettings(),
    getT(),
  ]);
  const requests = (topups ?? []) as unknown as Topup[];

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">{t("w_eyebrow")}</p>
        <h1>{t("w_h1")}</h1>
      </header>
      <div className="wallet-grid">
        <div className="space-y-6">
          <section className="balance-card">
            <p className="eyebrow">{t("w_balance")}</p>
            <p className="balance-amount" dir="ltr">{pkr(profile?.balance ?? 0)}</p>
            <p className="balance-note">{t("w_note")}</p>
            <div className="balance-actions">
              <a href="#add-money" className="btn-gold">{t("w_add")}</a>
              <Link href="/#draws" className="balance-link">{t("w_browse")} <Icon name="arrow" size={16} className="flip-rtl" /></Link>
            </div>
            {!profile?.phone && (
              <Link href="/profile?welcome=1&next=/wallet" className="balance-warn"><Icon name="alert" size={16} /> {t("w_phone")}</Link>
            )}
          </section>

          <PaymentForm userId={user.id} settings={settings} />
        </div>

        <div className="space-y-6">
          <section className="panel">
            <h2 className="panel-title mb-3">{t("w_requests")}</h2>
            {requests.length === 0 ? (
              <p className="text-sm text-pine-900/60">{t("w_requests_none")}</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {requests.map((r) => {
                  const [label, cls] = STATUS[r.status] ?? STATUS.pending!;
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {pkr(r.amount)}
                          {r.draws && (
                            <span className="font-normal text-pine-900/70">
                              {" · "}{t("w_in_draw", { n: r.qty ?? "?" })}{" "}
                              <Link className="auth-link" href={`/draws/${r.draws.id}`}>{r.draws.title}</Link>
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-pine-900/60"><span dir="ltr">TID {r.trx_id}</span> · {dateText(t.lang, r.created_at)}</p>
                        {r.admin_note && <p className="text-xs text-pine-900/60">{t("w_note_admin", { note: r.admin_note })}</p>}
                        {r.status === "approved" && r.result?.startsWith("entered") && <p className="text-xs font-semibold text-pine-700">{t("w_entered")}</p>}
                        {r.status === "pending" && <p className="text-xs text-pine-900/60">{t("w_checking")}</p>}
                      </div>
                      <span className={`pill ${cls}`}>{t(label)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="panel">
            <h2 className="panel-title mb-3">{t("w_history")}</h2>
            {(txns ?? []).length === 0 ? (
              <p className="text-sm text-pine-900/60">{t("w_history_none")}</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {(txns ?? []).map((x) => (
                  <li key={x.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span>
                      {KIND[x.kind] ? t(KIND[x.kind]!) : x.kind}
                      <span className="ms-2 text-xs text-pine-900/50">{dateText(t.lang, x.created_at)}</span>
                    </span>
                    <span dir="ltr" className={x.amount >= 0 ? "font-semibold text-pine-700" : "font-semibold text-red-600"}>
                      {x.amount >= 0 ? "+" : "−"}{pkr(Math.abs(x.amount))}
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
