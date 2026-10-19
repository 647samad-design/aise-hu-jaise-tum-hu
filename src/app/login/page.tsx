import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { safeNext } from "@/lib/validation";

export const metadata: Metadata = { title: "Sign in · 1Rupya" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const signupHref = next === "/" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`;

  const banner =
    sp.error === "link" || sp.error === "auth"
      ? { tone: "error" as const, text: "That sign-in link is invalid or has expired. Please sign in again." }
      : sp.password === "updated"
        ? { tone: "success" as const, text: "Password updated. Sign in with your new password." }
        : sp.next && sp.next !== "/"
          ? { tone: "info" as const, text: "Please sign in to continue." }
          : null;

  return (
    <AuthShell
      eyebrow="WELCOME BACK"
      title={<>Sign in to <em>1Rupya</em></>}
      subtitle="Track your tickets, wallet and results in one place."
      footer={
        <p>
          New to 1Rupya? <Link href={signupHref} className="auth-link">Create a free account</Link>
        </p>
      }
    >
      <LoginForm next={next} banner={banner} />
    </AuthShell>
  );
}
