"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { resendConfirmation, signUp, type AuthState } from "@/app/auth/actions";
import { Divider } from "@/components/auth/AuthShell";
import GoogleButton from "@/components/auth/GoogleButton";
import { Field, Notice, PasswordField, SubmitButton } from "@/components/auth/fields";

export default function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState | null, FormData>(signUp, null);
  const [resent, setResent] = useState<AuthState | null>(null);
  const [resending, startResend] = useTransition();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // The form remounts after each submit (to refill defaults), which clears the password boxes.
  useEffect(() => {
    setPassword("");
    setConfirm("");
  }, [state]);

  if (state?.kind === "check-email") {
    return (
      <div className="space-y-4 text-center">
        <div className="mail-badge" aria-hidden="true">✉</div>
        <h2 className="font-display text-2xl text-pine-900">Confirm your email</h2>
        <p className="text-sm leading-relaxed text-pine-900/70">
          We sent a confirmation link to <b className="text-pine-900">{state.email}</b>. Open it on this device to
          activate your account. Can&apos;t find it? Check your spam or promotions folder.
        </p>
        {resent && <Notice tone={resent.ok ? "success" : "error"}>{resent.message}</Notice>}
        <button
          type="button"
          className="btn-ghost w-full"
          disabled={resending}
          onClick={() => startResend(async () => setResent(await resendConfirmation(state.email!)))}
        >
          {resending ? "Sending…" : "Resend email"}
        </button>
        <Link href="/login" className="auth-link block text-sm">Back to sign in</Link>
      </div>
    );
  }

  const v = state?.values ?? {};
  const f = state?.fields ?? {};
  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <div className="space-y-5">
      <GoogleButton next={next} label="Sign up with Google" />
      <Divider>or with email</Divider>

      {state?.message && !state.ok && (
        <Notice tone="error">
          {state.message}{" "}
          {state.message.includes("already exists") && <Link href="/login" className="underline">Sign in</Link>}
        </Notice>
      )}

      <form key={JSON.stringify(state ?? {})} action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <Field
          name="full_name"
          label="Full name"
          icon="user"
          autoComplete="name"
          required
          defaultValue={v.full_name}
          placeholder="e.g. Ayesha Khan"
          error={f.full_name}
          hint="Use the same name as your EasyPaisa / JazzCash account."
        />
        <Field
          name="email"
          label="Email"
          type="email"
          icon="mail"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={v.email}
          placeholder="you@example.com"
          error={f.email}
        />
        <Field
          name="phone"
          label="Mobile number"
          type="tel"
          icon="phone"
          autoComplete="tel"
          inputMode="tel"
          required
          defaultValue={v.phone}
          placeholder="03001234567"
          error={f.phone}
          hint="Winners are contacted on this number."
        />
        <PasswordField label="Create password" autoComplete="new-password" meter error={f.password} onValue={setPassword} />
        <PasswordField
          name="confirm"
          label="Confirm password"
          autoComplete="new-password"
          error={f.confirm ?? (mismatch ? "Passwords do not match" : undefined)}
          onValue={setConfirm}
        />

        <label className={`check-row ${f.adult ? "has-error" : ""}`}>
          <input type="checkbox" name="adult" required />
          <span>
            I am <b>18 or older</b> and agree to the <Link href="/terms" className="auth-link" target="_blank">Terms</Link>{" "}
            and <Link href="/privacy" className="auth-link" target="_blank">Privacy Policy</Link>.
          </span>
        </label>
        {f.adult && <p className="field-error -mt-2" role="alert">{f.adult}</p>}

        <SubmitButton pendingText="Creating account…" className="btn-gold">Create account</SubmitButton>
      </form>
    </div>
  );
}
