import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Icon, { type IconName } from "@/components/Icon";
import MarkSeen from "@/components/MarkSeen";
import { getSessionProfile } from "@/lib/auth";
import { type Notification } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { agoText } from "@/lib/i18n/time";

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
  const t = await getT();
  const seen = profile?.notifications_seen_at ? new Date(profile.notifications_seen_at).getTime() : 0;

  return (
    <div className="page narrow">
      <MarkSeen />
      <header className="page-head">
        <p className="eyebrow">{t("nt_eyebrow")}</p>
        <h1>{t("nt_h1")}</h1>
        <p>{t("nt_p")}</p>
      </header>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="bell" /></div>
          <h3>{t("nt_none_h")}</h3>
          <p>{t("nt_none_p")}</p>
        </div>
      ) : (
        <ul className="notif-list">
          {list.map((n) => {
            const unread = new Date(n.created_at).getTime() > seen;
            const inner = (
              <>
                <span className={`notif-icon k-${n.kind}`}><Icon name={ICON[n.kind] ?? "info"} size={18} /></span>
                <span className="notif-text">
                  <span className="notif-title" dir="auto">{n.title}</span>
                  {n.body && <span className="notif-body" dir="auto">{n.body}</span>}
                  <span className="notif-time">{n.user_id === null ? t("nt_everyone") : ""}{agoText(t, t.lang, n.created_at)}</span>
                </span>
                {unread && <span className="notif-dot" aria-label={t("nt_new")} />}
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
