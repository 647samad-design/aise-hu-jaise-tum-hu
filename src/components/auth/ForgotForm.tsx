"use client";

import { useActionState } from "react";
import { requestPasswordReset, type AuthState } from "@/app/auth/actions";
import { Field, Notice, SubmitButton } from "@/components/auth/fields";

export default function ForgotForm({ expired }: { expired: boolean }) {
  const [state, action] = useActionState<AuthState | null, FormData>(requestPasswordReset, null);

  if (state?.kind === "sent") {
    return (
      <div className="space-y-4">
        <Notice tone="success">
          If an account exists for <b>{state.email}</b>, a reset link is on its way. It expires in one hour.
        </Notice>
        <p className="text-sm text-pine-900/60">
          Didn&apos;t get it? Check spam, or wait a minute and try again.
        </p>
      </div>
    );
  }

  return (
    <form key={JSON.stringify(state ?? {})} action={action} className="space-y-4" noValidate>
      {expired && !state && <Notice tone="error">That reset link has expired or was already used. Request a new one below.</Notice>}
      {state?.message && <Notice tone="error">{state.message}</Notice>}
      <Field
        name="email"
        label="Email"
        type="email"
        icon="mail"
        autoComplete="email"
        inputMode="email"
        required
        autoFocus
        defaultValue={state?.values?.email}
        placeholder="you@example.com"
        error={state?.fields?.email}
      />
      <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
    </form>
  );
}
