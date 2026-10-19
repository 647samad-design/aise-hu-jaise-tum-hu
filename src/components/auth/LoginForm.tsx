"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { resendConfirmation, sendMagicLink, signInWithPassword, type AuthState } from "@/app/auth/actions";
import { Divider } from "@/components/auth/AuthShell";
import GoogleButton from "@/components/auth/GoogleButton";
import { Field, Notice, PasswordField, SubmitButton } from "@/components/auth/fields";

type Banner = { tone: "error" | "success" | "info"; text: string } | null;

export default function LoginForm({ next, banner }: { next: string; banner: Banner }) {
  const [mode, setMode] = useState<"password" | "link">("password");
  const [pwState, pwAction] = useActionState<AuthState | null, FormData>(signInWithPassword, null);
  const [linkState, linkAction] = useActionState<AuthState | null, FormData>(sendMagicLink, null);
  const [resent, setResent] = useState<AuthState | null>(null);
  const [resending, startResend] = useTransition();

  const state = mode === "password" ? pwState : linkState;
  const email = state?.values?.email ?? "";

  if (mode === "link" && linkState?.kind === "sent") {
    return (
      <div className="space-y-4">
        <Notice tone="success">
          <b>Check your inbox.</b> {linkState.message} The link works once and expires in an hour.
        </Notice>
        <button type="button" className="btn-ghost w-full" onClick={() => setMode("password")}>
          Sign in with password instead
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {banner && !state && <Notice tone={banner.tone}>{banner.text}</Notice>}

      <GoogleButton next={next} />
      <Divider>or with email</Divider>

      <div className="seg" role="tablist" aria-label="Sign-in method">
        <button type="button" role="tab" aria-selected={mode === "password"} onClick={() => setMode("password")}>
          Password
        </button>
        <button type="button" role="tab" aria-selected={mode === "link"} onClick={() => setMode("link")}>
          Email link
        </button>
      </div>

      {state?.message && !state.ok && (
        <Notice tone="error">
          {state.message}
          {state.kind === "unconfirmed" && state.email && (
            <button
              type="button"
              className="notice-action"
              disabled={resending}
              onClick={() => startResend(async () => setResent(await resendConfirmation(state.email!)))}
            >
              {resending ? "Sending…" : "Resend confirmation email"}
            </button>
          )}
        </Notice>
      )}
      {resent && <Notice tone={resent.ok ? "success" : "error"}>{resent.message}</Notice>}

      {mode === "password" ? (
        <form key={`pw-${JSON.stringify(pwState?.values ?? {})}-${pwState?.message ?? ""}`} action={pwAction} className="space-y-4" noValidate>
          <input type="hidden" name="next" value={next} />
          <Field
            name="email"
            label="Email"
            type="email"
            icon="mail"
            autoComplete="email"
            inputMode="email"
            required
            defaultValue={email}
            placeholder="you@example.com"
            error={pwState?.fields?.email}
            autoFocus
          />
          <PasswordField
            error={pwState?.fields?.password}
            aside={<Link href="/forgot-password" className="auth-link small">Forgot password?</Link>}
          />
          <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
        </form>
      ) : (
        <form key={`ml-${linkState?.message ?? ""}`} action={linkAction} className="space-y-4" noValidate>
          <input type="hidden" name="next" value={next} />
          <Field
            name="email"
            label="Email"
            type="email"
            icon="mail"
            autoComplete="email"
            inputMode="email"
            required
            defaultValue={linkState?.values?.email ?? ""}
            placeholder="you@example.com"
            error={linkState?.fields?.email}
            hint="We'll email you a one-time link. No password needed."
          />
          <SubmitButton pendingText="Sending link…">Email me a sign-in link</SubmitButton>
        </form>
      )}
    </div>
  );
}
