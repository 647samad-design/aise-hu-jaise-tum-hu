import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { pkr } from "@/lib/format";
import Icon from "@/components/Icon";
import UserMenu from "@/components/UserMenu";
import { BottomTabs, NavLinks } from "@/components/NavLinks";

export default async function Nav() {
  const session =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? await getSessionProfile().catch(() => null)
      : null;
  const user = session?.user;
  const profile = session?.profile;
  const name = profile?.full_name || user?.email || "";

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
          <Link href="/" className="flex items-center gap-2" aria-label="1Rupya home">
            <span className="brand-mark">1</span>
            <span className="brand-name">Rupya</span>
          </Link>

          <NavLinks />

          <nav aria-label="Account" className="nav-account">
            {user ? (
              <>
                <Link href="/notifications" className="bell" aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}>
                  <Icon name="bell" size={20} />
                  {unread > 0 && <span className="bell-count">{unread > 9 ? "9+" : unread}</span>}
                </Link>
                <Link href="/wallet" className="wallet-chip" title="Wallet balance">
                  <Icon name="wallet" size={16} />
                  {pkr(profile?.balance ?? 0)}
                </Link>
                <UserMenu name={name} email={user.email ?? ""} isAdmin={!!profile?.is_admin} needsPhone={!profile?.phone} unread={unread} />
              </>
            ) : (
              <>
                <Link href="/login" className="nav-signin">Sign in</Link>
                <Link href="/signup" className="nav-cta">Get started</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <BottomTabs signedIn={!!user} />
    </>
  );
}
