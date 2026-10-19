import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminAnnounceForm from "@/components/AdminAnnounceForm";
import AdminDrawActions from "@/components/AdminDrawActions";
import AdminDrawForm from "@/components/AdminDrawForm";
import ProgressBar from "@/components/ProgressBar";
import DrawManager from "@/components/admin/DrawManager";
import PaymentRow, { type AdminPayment } from "@/components/admin/PaymentRow";
import SettingsForm from "@/components/admin/SettingsForm";
import { getSessionProfile } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";
import { isUpcoming, longDate, pkr, shortDate, type Draw } from "@/lib/format";
import { getPaySettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Admin · 1Rupya", robots: { index: false } };
export const dynamic = "force-dynamic";

type Stats = {
  users: number;
  open_draws: number;
  pending_topups: number;
  approved_total: number;
  wallet_liability: number;
  ticket_revenue: number;
};

type RawPayment = Omit<AdminPayment, "screenshot" | "draw" | "user"> & {
  screenshot_path: string | null;
  draws: AdminPayment["draw"];
  profiles: AdminPayment["user"];
};

const TABS = [
  ["payments", "Payments"],
  ["draws", "Draws"],
  ["new", "New draw"],
  ["announce", "Announce"],
  ["settings", "Payment settings"],
  ["users", "Players"],
] as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { tab = "payments", q = "" } = await searchParams;
  const { supabase, user, profile } = await getSessionProfile();
  if (!user) redirect("/login?next=/admin");
  if (!profile?.is_admin) redirect("/");

  const [{ data: stats }, { data: pendingRaw, error: pendingError }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase
      .from("topups")
      .select("id, amount, trx_id, method, sender_name, created_at, qty, screenshot_path, draws(id, title, ticket_price), profiles!topups_user_id_fkey(full_name, phone, email)")
      .eq("status", "pending")
      .order("created_at"),
  ]);
  const s = (stats ?? {}) as Stats;
  const raw = (pendingRaw ?? []) as unknown as RawPayment[];

  const tiles: [string, string, string?][] = [
    ["Waiting for you", String(raw.length), raw.length ? "hot" : undefined],
    ["Players", String(s.users ?? 0)],
    ["Active draws", String(s.open_draws ?? 0)],
    ["Money received", pkr(s.approved_total ?? 0)],
    ["Ticket sales", pkr(s.ticket_revenue ?? 0)],
    ["Owed to wallets", pkr(s.wallet_liability ?? 0)],
  ];

  return (
    <div className="page">
      <header className="page-head !pb-4">
        <p className="eyebrow">CONTROL ROOM</p>
        <h1>Admin</h1>
      </header>

      <section className="admin-tiles">
        {tiles.map(([k, v, hot]) => (
          <div key={k} className={`stat ${hot ? "gold" : ""}`}><span>{k}</span><strong>{v}</strong></div>
        ))}
      </section>

      <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/admin?tab=${key}`} aria-current={tab === key ? "page" : undefined}>
            {label}
            {key === "payments" && raw.length > 0 && <span className="menu-count">{raw.length}</span>}
          </Link>
        ))}
      </nav>

      {pendingError && (
        <div className="notice notice-error mb-6" role="alert">
          Could not load payments: {pendingError.message}. If you just updated the app, run <b>supabase/schema.sql</b> again in the Supabase SQL editor.
        </div>
      )}
      {tab === "payments" && <Payments supabase={supabase} raw={raw} />}
      {tab === "draws" && <Draws supabase={supabase} />}
      {tab === "new" && (
        <section className="panel">
          <h2 className="panel-title mb-1">Create a draw</h2>
          <p className="panel-sub">Every player gets a notification. Good photos and clear facts sell tickets faster.</p>
          <AdminDrawForm />
        </section>
      )}
      {tab === "announce" && (
        <section className="panel">
          <h2 className="panel-title mb-1">Announce to all players</h2>
          <p className="panel-sub">Shows in every player&apos;s notifications (bell). Tick “email” to also send it to their inbox.</p>
          <AdminAnnounceForm />
        </section>
      )}
      {tab === "settings" && (
        <section className="panel">
          <h2 className="panel-title mb-1">Payment settings</h2>
          <p className="panel-sub">What players see when they pay. Changes apply immediately — no redeploy needed.</p>
          <SettingsForm initial={await getPaySettings()} />
          <div className="mt-6 rounded-lg bg-pine-50 p-4 text-sm text-pine-900/80">
            <b>Email status:</b> {emailConfigured() ? "set up ✓ — approval emails and participant emails are on." : "not set up. Add RESEND_API_KEY and EMAIL_FROM in your hosting env vars (see README → Emails)."}
          </div>
        </section>
      )}
      {tab === "users" && <Players supabase={supabase} q={q} />}
    </div>
  );
}

type Sb = Awaited<ReturnType<typeof getSessionProfile>>["supabase"];

async function Payments({ supabase, raw }: { supabase: Sb; raw: RawPayment[] }) {
  const paths = raw.map((r) => r.screenshot_path).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrls(paths, 3600);
    (data ?? []).forEach((d) => d.path && d.signedUrl && signed.set(d.path, d.signedUrl));
  }
  const list: AdminPayment[] = raw.map((r) => ({
    id: r.id,
    amount: r.amount,
    trx_id: r.trx_id,
    method: r.method,
    sender_name: r.sender_name,
    created_at: r.created_at,
    qty: r.qty,
    screenshot: r.screenshot_path ? signed.get(r.screenshot_path) ?? null : null,
    draw: r.draws,
    user: r.profiles,
  }));

  const { data: recent } = await supabase
    .from("topups")
    .select("id, amount, status, result, reviewed_at, sender_name, profiles!topups_user_id_fkey(full_name)")
    .neq("status", "pending")
    .order("reviewed_at", { ascending: false })
    .limit(15);

  return (
    <div className="space-y-6">
      <section className="panel">
        <h2 className="panel-title mb-1">Payments to verify ({list.length})</h2>
        <p className="panel-sub">
          Open your EasyPaisa / JazzCash history, match the <b>amount</b>, <b>TID</b> and <b>sender name</b>, then approve. Approving a “Join”
          payment enters the player in that draw and emails them automatically.
        </p>
        {list.length === 0 ? <p className="text-sm text-pine-900/60">All caught up. 🎉</p> : <ul className="space-y-4">{list.map((p) => <PaymentRow key={p.id} p={p} />)}</ul>}
      </section>
      <section className="panel">
        <h2 className="panel-title mb-3">Recently reviewed</h2>
        <ul className="divide-y divide-black/5 text-sm">
          {(recent ?? []).map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>#{t.id} · {pkr(t.amount)} · {(t as unknown as { profiles: { full_name: string | null } | null }).profiles?.full_name ?? "—"}</span>
              <span className="text-xs text-pine-900/60">{t.result ?? ""} {t.reviewed_at ? `· ${shortDate(t.reviewed_at)}` : ""}</span>
              <span className={`pill ${t.status === "approved" ? "pill-green" : "pill-red"}`}>{t.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

async function Draws({ supabase }: { supabase: Sb }) {
  const [{ data: draws }, { data: logs }] = await Promise.all([
    supabase.from("draws").select("*").order("created_at", { ascending: false }).limit(40),
    supabase.from("email_log").select("draw_id, kind, recipients, created_at").order("created_at", { ascending: false }).limit(200),
  ]);
  const lastEmail = new Map<string, { kind: string; recipients: number; created_at: string }>();
  (logs ?? []).forEach((l) => l.draw_id && !lastEmail.has(l.draw_id) && lastEmail.set(l.draw_id, l));
  const ready = emailConfigured();

  return (
    <section className="panel">
      <h2 className="panel-title mb-3">Draws</h2>
      {(draws ?? []).length === 0 && <p className="text-sm text-pine-900/60">No draws yet. <Link className="auth-link" href="/admin?tab=new">Create one</Link>.</p>}
      <ul className="divide-y divide-black/5">
        {((draws ?? []) as Draw[]).map((d) => (
          <li key={d.id} className="space-y-3 py-5">
            <div className="flex flex-wrap items-center gap-3">
              {d.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <span className="grid h-14 w-14 place-items-center rounded-lg bg-pine-100 font-display text-2xl text-pine-500/50">1</span>
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/draws/${d.id}`} className="font-semibold text-pine-900 underline-offset-4 hover:underline">{d.title}</Link>
                <p className="text-xs text-pine-900/60">
                  {pkr(d.ticket_price)} × {d.target_tickets} · {d.participants ?? 0} participants
                  {isUpcoming(d) && d.opens_at ? ` · opens ${longDate(d.opens_at)}` : ""}
                </p>
              </div>
              <span className={`pill ${d.status === "open" ? "pill-green" : d.status === "full" ? "pill-amber" : d.status === "drawn" ? "pill-muted" : "pill-red"}`}>
                {isUpcoming(d) ? "coming soon" : d.status}
              </span>
            </div>
            <ProgressBar sold={d.sold_tickets} target={d.target_tickets} />
            {d.status === "drawn" && <p className="text-sm">🏆 {d.winner_label} · ticket #{d.winner_ticket}{d.delivered_at ? " · delivered ✓" : ""}</p>}
            <AdminDrawActions id={d.id} status={d.status} />
            <DrawManager draw={d} lastEmail={lastEmail.get(d.id) ?? null} emailReady={ready} />
          </li>
        ))}
      </ul>
    </section>
  );
}

async function Players({ supabase, q }: { supabase: Sb; q: string }) {
  let query = supabase.from("profiles").select("id, full_name, phone, email, balance, created_at").order("created_at", { ascending: false }).limit(100);
  const term = q.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  const { data: users } = await query;
  return (
    <section className="panel">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title">Players</h2>
        <form className="flex gap-2">
          <input type="hidden" name="tab" value="users" />
          <input name="q" defaultValue={q} placeholder="Search name, email, phone" className="input !py-2" />
          <button className="btn-ghost !py-2">Search</button>
        </form>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-pine-900/60">
            <tr><th className="py-1 pr-3">Name</th><th className="pr-3">Phone</th><th className="pr-3">Email</th><th className="pr-3">Wallet</th><th>Joined</th></tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td className="py-2 pr-3">{u.full_name ?? "—"}</td>
                <td className="pr-3">{u.phone ? <a className="auth-link" href={`https://wa.me/92${u.phone.replace(/^\+?92|^0/, "")}`} target="_blank" rel="noopener noreferrer">{u.phone}</a> : "—"}</td>
                <td className="pr-3">{u.email}</td>
                <td className="pr-3">{pkr(u.balance)}</td>
                <td className="text-xs text-pine-900/60">{shortDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
