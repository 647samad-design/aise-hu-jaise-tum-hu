import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import NewPasswordForm from "@/components/auth/NewPasswordForm";
import { Notice } from "@/components/auth/fields";
import { getSessionProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose a new password · 1Rupya" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const { user } = await getSessionProfile();

  return (
    <AuthShell
      eyebrow="ACCOUNT RECOVERY"
      title={<>Choose a new <em>password</em></>}
      subtitle={user?.email ? <>For <b>{user.email}</b></> : undefined}
    >
      {user ? (
        <NewPasswordForm next="/" submitLabel="Save new password" />
      ) : (
        <div className="space-y-4">
          <Notice tone="error">This reset link has expired or was already used.</Notice>
          <Link href="/forgot-password" className="btn-primary w-full">Request a new link</Link>
        </div>
      )}
    </AuthShell>
  );
}
