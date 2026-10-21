import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import Icon from "@/components/Icon";
import ProfileForm from "@/components/ProfileForm";
import NewPasswordForm from "@/components/auth/NewPasswordForm";
import { Notice } from "@/components/auth/fields";
import { getSessionProfile } from "@/lib/auth";
import { pkr } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { dateText } from "@/lib/i18n/time";
import { safeNext } from "@/lib/validation";

export const metadata: Metadata = { title: "Account · 1Rupya", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login?next=/profile");

  const t = await getT();
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
          <p className="eyebrow">{t("pr_eyebrow_welcome")}</p>
          <h1>{t("pr_h1_welcome")}</h1>
          <p>{t("pr_p_welcome")}</p>
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
        <p className="eyebrow">{t("pr_eyebrow")}</p>
        <h1>{t("pr_h1")}</h1>
      </header>

      <div className="account-grid">
        <aside className="panel account-card">
          <div className="avatar lg">{initials}</div>
          <p className="account-name">{profile?.full_name || t("pr_unnamed")}</p>
          <p className="account-email">{user.email}</p>
          <dl className="account-meta">
            <div><dt>{t("pr_wallet")}</dt><dd dir="ltr">{pkr(profile?.balance ?? 0)}</dd></div>
            <div><dt>{t("pr_signed_with")}</dt><dd className="capitalize">{provider}</dd></div>
            <div><dt>{t("pr_since")}</dt><dd>{profile?.created_at ? dateText(t.lang, profile.created_at).split(/[,،]/)[0] : "—"}</dd></div>
          </dl>
          <div className="account-links">
            <Link href="/tickets"><Icon name="ticket" size={18} /> {t("nav_tickets")}</Link>
            <Link href="/wallet"><Icon name="wallet" size={18} /> {t("nav_wallet")}</Link>
            <Link href="/notifications"><Icon name="bell" size={18} /> {t("nav_notifications")}</Link>
            {profile?.is_admin && <Link href="/admin"><Icon name="settings" size={18} /> {t("nav_admin")}</Link>}
          </div>
          <form action={signOut}>
            <button className="btn-ghost w-full"><Icon name="logout" size={18} /> {t("nav_signout")}</button>
          </form>
        </aside>

        <div className="space-y-6">
          {!profile?.phone && (
            <Notice tone="info">{t("pr_add_phone")}</Notice>
          )}
          {sp.password === "updated" && <Notice tone="success">{t("pr_pw_updated")}</Notice>}

          <section className="panel">
            <h2 className="panel-title">{t("pr_details")}</h2>
            <p className="panel-sub">{t("pr_details_p")}</p>
            <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} />
          </section>

          <section className="panel">
            <h2 className="panel-title">{provider === "email" ? t("pr_change_pw") : t("pr_set_pw")}</h2>
            <p className="panel-sub">{provider === "email" ? t("pr_pw_p") : t("pr_pw_p_google")}</p>
            <NewPasswordForm stay submitLabel={provider === "email" ? t("pw_update") : t("pr_set_pw")} />
          </section>

          <section className="panel">
            <h2 className="panel-title">{t("pr_email_h")}</h2>
            <p className="panel-sub">{t("pr_email_p", { email: user.email ?? "" })}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
