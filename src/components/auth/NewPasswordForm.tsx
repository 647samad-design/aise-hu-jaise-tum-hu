"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "@/app/auth/actions";
import { Notice, PasswordField, SubmitButton } from "@/components/auth/fields";
import { useT } from "@/components/I18nProvider";

/** `stay` keeps the user on the current page (account settings); otherwise redirects to `next`. */
export default function NewPasswordForm({ next = "/", stay = false, submitLabel }: { next?: string; stay?: boolean; submitLabel?: string }) {
  const t = useT();
  const [state, action] = useActionState<AuthState | null, FormData>(updatePassword, null);

  return (
    <form key={JSON.stringify(state ?? {})} action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {stay && <input type="hidden" name="after" value="stay" />}
      {state?.message && <Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice>}
      <PasswordField label={t("pw_new")} autoComplete="new-password" meter error={state?.fields?.password} />
      <PasswordField name="confirm" label={t("pw_confirm_new")} autoComplete="new-password" error={state?.fields?.confirm} />
      <SubmitButton pendingText={t("pw_saving")}>{submitLabel ?? t("pw_update")}</SubmitButton>
    </form>
  );
}
