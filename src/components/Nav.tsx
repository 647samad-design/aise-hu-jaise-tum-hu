import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { pkr } from "@/lib/format";
import Icon from "@/components/Icon";
import UserMenu from "@/components/UserMenu";
import { BottomTabs, NavLinks } from "@/components/NavLinks";
import LangToggle from "@/components/LangToggle";
import { getT } from "@/lib/i18n/server";

export default async function Nav() {
  const session =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? await getSessionProfile().catch(() => null)
      : null;
  const user = session?.user;
  const profile = session?.profile;
  const name = profile?.full_name || user?.email || "";
  const t = await getT();

  // Unread = own or broadcast notifications newer than the last time the player opened the list.
  let unread = 0;
  if (session && user) {
    const { count } = await session.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .gt("created_at", profile?.notifications_seen_at ?? "1970-01-01");
    unread = count ?? 0;
  }

  return (
    <>
      <header className="site-header">
        <div className="nav-inner">
          <Link href="/" className="flex items-center gap-2" aria-label="1Rupya home" dir="ltr">
            <span className="brand-mark">1</span>
            <span className="brand-name">Rupya</span>
          </Link>

          <NavLinks />

          <nav aria-label="Account" className="nav-account">
            <LangToggle />
            {user ? (
              <>
                <Link href="/notifications" className="bell" aria-label={unread ? t("nav_notifications_n", { n: unread }) : t("nav_notifications")}>
                  <Icon name="bell" size={20} />
                  {unread > 0 && <span className="bell-count">{unread > 9 ? "9+" : unread}</span>}
                </Link>
                <Link href="/wallet" className="wallet-chip" title={t("nav_wallet")}>
                  <Icon name="wallet" size={16} />
                  {pkr(profile?.balance ?? 0)}
                </Link>
                <UserMenu name={name} email={user.email ?? ""} isAdmin={!!profile?.is_admin} needsPhone={!profile?.phone} unread={unread} />
              </>
            ) : (
              <>
                <Link href="/login" className="nav-signin">{t("nav_signin")}</Link>
                <Link href="/signup" className="nav-cta">{t("nav_signup")}</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <BottomTabs signedIn={!!user} />
    </>
  );
}
