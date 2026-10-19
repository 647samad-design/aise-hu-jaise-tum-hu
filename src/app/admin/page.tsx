import Link from "next/link";
import { redirect } from "next/navigation";
import AdminDrawActions from "@/components/AdminDrawActions";
import AdminAnnounceForm from "@/components/AdminAnnounceForm";
import AdminDrawForm from "@/components/AdminDrawForm";
import AdminTopupRow from "@/components/AdminTopupRow";
import ProgressBar from "@/components/ProgressBar";
import { getSessionProfile } from "@/lib/auth";
import { pkr, type Draw } from "@/lib/format";

export const dynamic = "force-dynamic";

type Stats = {
  users: number;
  open_draws: number;
  pending_topups: number;
  approved_total: number;
  wallet_liability: number;
  ticket_revenue: number;
};

type PendingTopup = {
  id: number;
  amount: number;
  trx_id: string;
  method: string;
  sender_name: string | null;
  created_at: string;
  profiles: { full_name: string | null; phone: string | null; email: string | null } | null;
};

export default async function AdminPage() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (!profile?.is_admin) redirect("/");

  const [{ data: stats }, { data: topups }, { data: draws }, { data: users }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase
      .from("topups")
      .select("id, amount, trx_id, method, sender_name, created_at, profiles(full_name, phone, email)")
      .eq("status", "pending")
      .order("created_at"),
    supabase.from("draws").select("*").order("created_at", { ascending: false }).limit(30),
    supabase.from("profiles").select("id, full_name, phone, email, balance, created_at").order("created_at", { ascending: false }).limit(50),
  ]);

  const s = (stats ?? {}) as Stats;
  const pending = (topups ?? []) as unknown as PendingTopup[];
  const drawList = (draws ?? []) as Draw[];

  const tiles: [string, string][] = [
    ["Users", String(s.users ?? 0)],
    ["Active draws", String(s.open_draws ?? 0)],
    ["Pending top-ups", String(s.pending_topups ?? 0)],
    ["Money received", pkr(s.approved_total ?? 0)],
    ["Ticket revenue", pkr(s.ticket_revenue ?? 0)],
    ["Owed to wallets", pkr(s.wallet_liability ?? 0)],
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold text-pine-800">Admin</h1>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-xs text-pine-900/60">{k}</p>
            <p className="font-display text-xl font-bold text-pine-800">{v}</p>
          </div>
        ))}
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-display text-xl font-bold text-pine-800">Pending top-ups ({pending.length})</h2>
        <p className="mb-2 text-xs text-pine-900/60">
          Check the TRX ID against your EasyPaisa / JazzCash history before approving. Approving credits the wallet instantly.
        </p>
        {pending.length === 0 ? (
          <p className="text-sm text-pine-900/60">Nothing waiting.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {pending.map((t) => (
              <AdminTopupRow
                key={t.id}
                id={t.id}
                amount={t.amount}
                trxId={t.trx_id}
                method={t.method}
                senderName={t.sender_name}
                createdAt={t.created_at}
                userName={t.profiles?.full_name ?? null}
                userPhone={t.profiles?.phone ?? null}
                userEmail={t.profiles?.email ?? null}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-display text-xl font-bold text-pine-800">Announce to all players</h2>
        <p className="mb-3 text-xs text-pine-900/60">Appears in every player&apos;s notifications (bell icon). Use it to say when the next lucky draw opens.</p>
        <AdminAnnounceForm />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-display text-xl font-bold text-pine-800">New draw</h2>
        <AdminDrawForm />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-display text-xl font-bold text-pine-800">Draws</h2>
        <ul className="divide-y divide-black/5">
          {drawList.map((d) => (
            <li key={d.id} className="space-y-2 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/draws/${d.id}`} className="font-semibold text-pine-800 underline">{d.title}</Link>
                <span className="rounded-full bg-pine-100 px-3 py-1 text-xs font-semibold text-pine-800">{d.status}</span>
              </div>
              <ProgressBar sold={d.sold_tickets} target={d.target_tickets} />
              {d.status === "drawn" && (
                <p className="text-sm">🏆 {d.winner_label} · ticket #{d.winner_ticket}</p>
              )}
              <AdminDrawActions id={d.id} status={d.status} />
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-display text-xl font-bold text-pine-800">Latest users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-pine-900/60">
              <tr><th className="py-1 pr-3">Name</th><th className="pr-3">Phone</th><th className="pr-3">Email</th><th>Balance</th></tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {(users ?? []).map((u) => (
                <tr key={u.id}>
                  <td className="py-2 pr-3">{u.full_name ?? "—"}</td>
                  <td className="pr-3">{u.phone ?? "—"}</td>
                  <td className="pr-3">{u.email}</td>
                  <td>{pkr(u.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
