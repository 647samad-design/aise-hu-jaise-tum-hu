"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "@/app/auth/actions";
import { Notice, PasswordField, SubmitButton } from "@/components/auth/fields";

/** `stay` keeps the user on the current page (account settings); otherwise redirects to `next`. */
export default function NewPasswordForm({ next = "/", stay = false, submitLabel = "Update password" }: { next?: string; stay?: boolean; submitLabel?: string }) {
  const [state, action] = useActionState<AuthState | null, FormData>(updatePassword, null);

  return (
    <form key={JSON.stringify(state ?? {})} action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {stay && <input type="hidden" name="after" value="stay" />}
      {state?.message && <Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice>}
      <PasswordField label="New password" autoComplete="new-password" meter error={state?.fields?.password} />
      <PasswordField name="confirm" label="Confirm new password" autoComplete="new-password" error={state?.fields?.confirm} />
      <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}
