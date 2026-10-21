"use client";

import { useActionState } from "react";
import { requestPasswordReset, type AuthState } from "@/app/auth/actions";
import { Field, Notice, SubmitButton } from "@/components/auth/fields";
import { useT } from "@/components/I18nProvider";

export default function ForgotForm({ expired }: { expired: boolean }) {
  const [state, action] = useActionState<AuthState | null, FormData>(requestPasswordReset, null);
  const t = useT();

  if (state?.kind === "sent") {
    return (
      <div className="space-y-4">
        <Notice tone="success">
          {t("fp_sent", { email: state.email ?? "" })}
        </Notice>
        <p className="text-sm text-pine-900/60">
          {t("fp_sent_hint")}
        </p>
      </div>
    );
  }

  return (
    <form key={JSON.stringify(state ?? {})} action={action} className="space-y-4" noValidate>
      {expired && !state && <Notice tone="error">{t("fp_expired")}</Notice>}
      {state?.message && <Notice tone="error">{state.message}</Notice>}
      <Field
        name="email"
        label={t("su_email")}
        dir="ltr"
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
      <SubmitButton pendingText={t("fp_sending")}>{t("fp_submit")}</SubmitButton>
    </form>
  );
}
