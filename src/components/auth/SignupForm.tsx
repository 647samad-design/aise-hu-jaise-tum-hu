"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { resendConfirmation, signUp, type AuthState } from "@/app/auth/actions";
import { Divider } from "@/components/auth/Divider";
import GoogleButton from "@/components/auth/GoogleButton";
import { Field, Notice, PasswordField, SubmitButton } from "@/components/auth/fields";
import { useT } from "@/components/I18nProvider";

// Short sign-up: name, mobile, email, one password (with show/hide), 18+ tick.
export default function SignupForm({ next }: { next: string }) {
  const t = useT();
  const [state, action] = useActionState<AuthState | null, FormData>(signUp, null);
  const [resent, setResent] = useState<AuthState | null>(null);
  const [resending, startResend] = useTransition();

  if (state?.kind === "check-email") {
    return (
      <div className="space-y-4 text-center">
        <div className="mail-badge" aria-hidden="true">✉</div>
        <h2 className="font-display text-2xl text-pine-900">{t("su_check_h")}</h2>
        <p className="text-sm leading-relaxed text-pine-900/70">{t("su_check_p", { email: state.email ?? "" })}</p>
        {resent && <Notice tone={resent.ok ? "success" : "error"}>{resent.message}</Notice>}
        <button
          type="button"
          className="btn-ghost w-full"
          disabled={resending}
          onClick={() => startResend(async () => setResent(await resendConfirmation(state.email!)))}
        >
          {resending ? t("li_resending") : t("su_resend")}
        </button>
        <Link href="/login" className="auth-link block text-sm">{t("su_back_login")}</Link>
      </div>
    );
  }

  const v = state?.values ?? {};
  const f = state?.fields ?? {};

  return (
    <div className="space-y-5">
      <GoogleButton next={next} label={t("au_google_up")} />
      <Divider>{t("au_or_email")}</Divider>

      {state?.message && !state.ok && (
        <Notice tone="error">
          {state.message}{" "}
          {state.message === t("e_exists") && <Link href="/login" className="underline">{t("su_signin")}</Link>}
        </Notice>
      )}

      <form key={JSON.stringify(state ?? {})} action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <Field
          name="full_name"
          label={t("pf_name")}
          icon="user"
          autoComplete="name"
          required
          defaultValue={v.full_name}
          placeholder={t("su_name_ph")}
          error={f.full_name}
          hint={t("pf_name_hint")}
        />
        <Field
          name="phone"
          label={t("pf_phone")}
          type="tel"
          icon="phone"
          autoComplete="tel"
          inputMode="tel"
          required
          defaultValue={v.phone}
          placeholder="03001234567"
          dir="ltr"
          error={f.phone}
          hint={t("su_phone_hint")}
        />
        <Field
          name="email"
          label={t("su_email")}
          type="email"
          icon="mail"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={v.email}
          placeholder="you@example.com"
          dir="ltr"
          error={f.email}
        />
        <PasswordField label={t("su_pw")} autoComplete="new-password" meter error={f.password} />

        <label className={`check-row ${f.adult ? "has-error" : ""}`}>
          <input type="checkbox" name="adult" required />
          <span>
            {t("su_adult_a")}<b>{t("su_adult_b")}</b>{t("su_adult_c")}
            <Link href="/terms" className="auth-link" target="_blank">{t("su_terms")}</Link>
            {t("su_and")}
            <Link href="/privacy" className="auth-link" target="_blank">{t("su_privacy")}</Link>
            {t("su_adult_d")}
          </span>
        </label>
        {f.adult && <p className="field-error -mt-2" role="alert">{f.adult}</p>}

        <SubmitButton pendingText={t("su_creating")} className="btn-gold">{t("su_submit")}</SubmitButton>
      </form>
    </div>
  );
}
