import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import Icon from "@/components/Icon";
import ProfileForm from "@/components/ProfileForm";
import NewPasswordForm from "@/components/auth/NewPasswordForm";
import { Notice } from "@/components/auth/fields";
import { getSessionProfile } from "@/lib/auth";
import { pkr, shortDate } from "@/lib/format";
import { safeNext } from "@/lib/validation";

export const metadata: Metadata = { title: "Account · 1Rupya", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login?next=/profile");

  const welcome = sp.welcome === "1";
  const next = welcome ? safeNext(sp.next) : undefined;
  const provider = (user.app_metadata?.provider as string | undefined) ?? "email";
  const initials = (profile?.full_name || user.email || "?")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");

  if (welcome) {
    return (
      <div className="page narrow">
        <header className="page-head">
          <p className="eyebrow">ONE LAST STEP</p>
          <h1>Complete your <em>profile</em></h1>
          <p>We need your name and mobile number before you can buy tickets, so winners can be contacted.</p>
        </header>
        <div className="panel">
          <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} next={next} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>Account <em>settings</em></h1>
      </header>

      <div className="account-grid">
        <aside className="panel account-card">
          <div className="avatar lg">{initials}</div>
          <p className="account-name">{profile?.full_name || "Unnamed player"}</p>
          <p className="account-email">{user.email}</p>
          <dl className="account-meta">
            <div><dt>Wallet</dt><dd>{pkr(profile?.balance ?? 0)}</dd></div>
            <div><dt>Signed in with</dt><dd className="capitalize">{provider}</dd></div>
            <div><dt>Member since</dt><dd>{profile?.created_at ? shortDate(profile.created_at).split(",")[0] : "—"}</dd></div>
          </dl>
          <div className="account-links">
            <Link href="/tickets"><Icon name="ticket" size={18} /> My tickets</Link>
            <Link href="/wallet"><Icon name="wallet" size={18} /> Wallet</Link>
            {profile?.is_admin && <Link href="/admin"><Icon name="settings" size={18} /> Admin</Link>}
          </div>
          <form action={signOut}>
            <button className="btn-ghost w-full"><Icon name="logout" size={18} /> Sign out</button>
          </form>
        </aside>

        <div className="space-y-6">
          {!profile?.phone && (
            <Notice tone="info">Add your mobile number to start buying tickets.</Notice>
          )}
          {sp.password === "updated" && <Notice tone="success">Your password was updated.</Notice>}

          <section className="panel">
            <h2 className="panel-title">Personal details</h2>
            <p className="panel-sub">Shown only to the 1Rupya team. Public results show a masked name like “A*** K.”</p>
            <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} />
          </section>

          <section className="panel">
            <h2 className="panel-title">{provider === "email" ? "Change password" : "Set a password"}</h2>
            <p className="panel-sub">
              {provider === "email"
                ? "Use at least 8 characters with a letter and a number."
                : "Optional. Lets you sign in with your email and password as well as Google."}
            </p>
            <NewPasswordForm stay submitLabel={provider === "email" ? "Update password" : "Set password"} />
          </section>

          <section className="panel">
            <h2 className="panel-title">Login email</h2>
            <p className="panel-sub">
              Your account email is <b>{user.email}</b>. To change it, contact support from this email address.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
