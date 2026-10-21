"use client";

import { useActionState } from "react";
import { saveProfile, type ActionResult } from "@/app/actions";
import { Field, Notice, SubmitButton } from "@/components/auth/fields";
import { useT } from "@/components/I18nProvider";

export default function ProfileForm({ fullName, phone, next }: { fullName: string; phone: string; next?: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveProfile, null);
  const t = useT();

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field
        name="full_name"
        label={t("pf_name")}
        icon="user"
        autoComplete="name"
        required
        defaultValue={fullName}
        hint={t("pf_name_hint")}
      />
      <Field
        name="phone"
        label={t("pf_phone")}
        icon="phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        required
        defaultValue={phone}
        placeholder="03001234567"
        hint={t("pf_phone_hint")}
        dir="ltr"
      />
      {state && <Notice tone={state.ok ? "success" : "error"}>{state.ok ? t("pf_saved") : state.message}</Notice>}
      <SubmitButton pendingText={t("pf_saving")}>{next ? t("pf_save_continue") : t("pf_save")}</SubmitButton>
    </form>
  );
}
