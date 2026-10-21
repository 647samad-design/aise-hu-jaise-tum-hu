import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import NewPasswordForm from "@/components/auth/NewPasswordForm";
import { Notice } from "@/components/auth/fields";
import { getSessionProfile } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Choose a new password · 1Rupya", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const { user } = await getSessionProfile();
  const t = await getT();

  return (
    <AuthShell
      eyebrow={t("fp_eyebrow")}
      title={<>{t("rp_title_a")}<em>{t("rp_title_b")}</em></>}
      subtitle={user?.email ? t("rp_for", { email: user.email }) : undefined}
    >
      {user ? (
        <NewPasswordForm next="/" submitLabel={t("rp_save")} />
      ) : (
        <div className="space-y-4">
          <Notice tone="error">{t("rp_expired")}</Notice>
          <Link href="/forgot-password" className="btn-primary w-full">{t("rp_new_link")}</Link>
        </div>
      )}
    </AuthShell>
  );
}
