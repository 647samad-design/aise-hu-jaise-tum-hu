import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { safeNext } from "@/lib/validation";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Sign in · 1Rupya" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const t = await getT();
  const signupHref = next === "/" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`;

  const banner =
    sp.error === "link" || sp.error === "auth"
      ? { tone: "error" as const, text: t("li_banner_link") }
      : sp.password === "updated"
        ? { tone: "success" as const, text: t("li_banner_pw") }
        : sp.next && sp.next !== "/"
          ? { tone: "info" as const, text: t("li_banner_next") }
          : null;

  return (
    <AuthShell
      eyebrow={t("li_eyebrow")}
      title={<>{t("li_title_a")}<em>1Rupya</em></>}
      subtitle={t("li_sub")}
      footer={
        <p>
          {t("li_new")} <Link href={signupHref} className="auth-link">{t("li_create")}</Link>
        </p>
      }
    >
      <LoginForm next={next} banner={banner} />
    </AuthShell>
  );
}
