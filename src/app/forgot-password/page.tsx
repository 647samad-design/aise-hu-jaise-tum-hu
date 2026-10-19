import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ForgotForm from "@/components/auth/ForgotForm";

export const metadata: Metadata = { title: "Reset password · 1Rupya" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { error } = await searchParams;
  return (
    <AuthShell
      eyebrow="ACCOUNT RECOVERY"
      title={<>Forgot your <em>password?</em></>}
      subtitle="Enter the email you signed up with and we'll send you a secure reset link."
      footer={
        <p>
          Remembered it? <Link href="/login" className="auth-link">Back to sign in</Link>
        </p>
      }
    >
      <ForgotForm expired={error === "expired"} />
    </AuthShell>
  );
}
