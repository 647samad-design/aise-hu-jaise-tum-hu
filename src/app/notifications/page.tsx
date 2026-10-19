import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Icon, { type IconName } from "@/components/Icon";
import MarkSeen from "@/components/MarkSeen";
import { getSessionProfile } from "@/lib/auth";
import { timeAgo, type Notification } from "@/lib/format";

export const metadata: Metadata = { title: "Notifications · 1Rupya", robots: { index: false } };
export const dynamic = "force-dynamic";

const ICON: Record<Notification["kind"], IconName> = {
  welcome: "spark",
  topup: "wallet",
  ticket: "ticket",
  soldout: "clock",
  result: "shield",
  win: "trophy",
  refund: "wallet",
  draw: "spark",
  announcement: "bell",
};

export default async function NotificationsPage() {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user) redirect("/login?next=/notifications");

  const { data } = await supabase
    .from("notifications")
    .select("id, user_id, kind, title, body, link, created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  const list = (data ?? []) as Notification[];
  const seen = profile?.notifications_seen_at ? new Date(profile.notifications_seen_at).getTime() : 0;

  return (
    <div className="page narrow">
      <MarkSeen />
      <header className="page-head">
        <p className="eyebrow">UPDATES</p>
        <h1>Notifi<em>cations</em></h1>
        <p>Payments, your draw entries, results and news about the next lucky draw — all in one place.</p>
      </header>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="bell" /></div>
          <h3>Nothing yet</h3>
          <p>When you add money, buy tickets or a draw finishes, you&apos;ll see it here.</p>
        </div>
      ) : (
        <ul className="notif-list">
          {list.map((n) => {
            const unread = new Date(n.created_at).getTime() > seen;
            const inner = (
              <>
                <span className={`notif-icon k-${n.kind}`}><Icon name={ICON[n.kind] ?? "info"} size={18} /></span>
                <span className="notif-text">
                  <span className="notif-title">{n.title}</span>
                  {n.body && <span className="notif-body">{n.body}</span>}
                  <span className="notif-time">{n.user_id === null ? "For everyone · " : ""}{timeAgo(n.created_at)}</span>
                </span>
                {unread && <span className="notif-dot" aria-label="New" />}
              </>
            );
            return (
              <li key={n.id} className={`notif ${unread ? "unread" : ""} ${n.kind === "win" ? "win" : ""}`}>
                {n.link ? <Link href={n.link}>{inner}</Link> : <div>{inner}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
