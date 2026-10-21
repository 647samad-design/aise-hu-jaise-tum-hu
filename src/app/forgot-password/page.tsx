import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ForgotForm from "@/components/auth/ForgotForm";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Reset password · 1Rupya" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { error } = await searchParams;
  const t = await getT();
  return (
    <AuthShell
      eyebrow={t("fp_eyebrow")}
      title={<>{t("fp_title_a")}<em>{t("fp_title_b")}</em></>}
      subtitle={t("fp_sub")}
      footer={
        <p>
          {t("fp_remember")} <Link href="/login" className="auth-link">{t("fp_back")}</Link>
        </p>
      }
    >
      <ForgotForm expired={error === "expired"} />
    </AuthShell>
  );
}
