import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";
import { safeNext } from "@/lib/validation";

export const metadata: Metadata = { title: "Create account · 1Rupya" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const loginHref = next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell
      eyebrow="JOIN 1RUPYA"
      title={<>Create your <em>account</em></>}
      subtitle="Takes under a minute. Free to join — you only pay for tickets you choose."
      footer={
        <p>
          Already have an account? <Link href={loginHref} className="auth-link">Sign in</Link>
        </p>
      }
    >
      <SignupForm next={next} />
    </AuthShell>
  );
}
