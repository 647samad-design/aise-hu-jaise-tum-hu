"use client";

import { useActionState } from "react";
import { saveProfile, type ActionResult } from "@/app/actions";
import { Field, Notice, SubmitButton } from "@/components/auth/fields";

export default function ProfileForm({ fullName, phone, next }: { fullName: string; phone: string; next?: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveProfile, null);

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field
        name="full_name"
        label="Full name"
        icon="user"
        autoComplete="name"
        required
        defaultValue={fullName}
        hint="Use the same name as your EasyPaisa / JazzCash account so we can match your payments."
      />
      <Field
        name="phone"
        label="Mobile number"
        icon="phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        required
        defaultValue={phone}
        placeholder="03001234567"
        hint="Winners are contacted on this number. It is never shown publicly."
      />
      {state && <Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice>}
      <SubmitButton pendingText="Saving…">{next ? "Save and continue" : "Save changes"}</SubmitButton>
    </form>
  );
}
