import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";
import { safeNext } from "@/lib/validation";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Create account · 1Rupya" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const t = await getT();
  const loginHref = next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell
      eyebrow={t("su_eyebrow")}
      title={<>{t("su_title_a")}<em>{t("su_title_b")}</em></>}
      subtitle={t("su_sub")}
      footer={
        <p>
          {t("su_have")} <Link href={loginHref} className="auth-link">{t("su_signin")}</Link>
        </p>
      }
    >
      <SignupForm next={next} />
    </AuthShell>
  );
}
