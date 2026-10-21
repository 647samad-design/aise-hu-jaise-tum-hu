"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { resendConfirmation, sendMagicLink, signInWithPassword, type AuthState } from "@/app/auth/actions";
import { Divider } from "@/components/auth/Divider";
import GoogleButton from "@/components/auth/GoogleButton";
import { Field, Notice, PasswordField, SubmitButton } from "@/components/auth/fields";
import { useT } from "@/components/I18nProvider";

type Banner = { tone: "error" | "success" | "info"; text: string } | null;

export default function LoginForm({ next, banner }: { next: string; banner: Banner }) {
  const t = useT();
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
          {t("li_link_sent")}
        </Notice>
        <button type="button" className="btn-ghost w-full" onClick={() => setMode("password")}>
          {t("li_use_pw")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {banner && !state && <Notice tone={banner.tone}>{banner.text}</Notice>}

      <GoogleButton next={next} />
      <Divider>{t("au_or_email")}</Divider>

      <div className="seg" role="tablist" aria-label={t("li_method")}>
        <button type="button" role="tab" aria-selected={mode === "password"} onClick={() => setMode("password")}>
          {t("li_tab_pw")}
        </button>
        <button type="button" role="tab" aria-selected={mode === "link"} onClick={() => setMode("link")}>
          {t("li_tab_link")}
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
              {resending ? t("li_resending") : t("li_resend")}
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
            label={t("su_email")}
            type="email"
            icon="mail"
            autoComplete="email"
            inputMode="email"
            required
            defaultValue={email}
            placeholder="you@example.com"
            dir="ltr"
            error={pwState?.fields?.email}
            autoFocus
          />
          <PasswordField
            error={pwState?.fields?.password}
            aside={<Link href="/forgot-password" className="auth-link small">{t("li_forgot")}</Link>}
          />
          <SubmitButton pendingText={t("li_signing")}>{t("li_submit")}</SubmitButton>
        </form>
      ) : (
        <form key={`ml-${linkState?.message ?? ""}`} action={linkAction} className="space-y-4" noValidate>
          <input type="hidden" name="next" value={next} />
          <Field
            name="email"
            label={t("su_email")}
            type="email"
            icon="mail"
            autoComplete="email"
            inputMode="email"
            required
            defaultValue={linkState?.values?.email ?? ""}
            placeholder="you@example.com"
            dir="ltr"
            error={linkState?.fields?.email}
            hint={t("li_link_hint")}
          />
          <SubmitButton pendingText={t("li_link_sending")}>{t("li_link_submit")}</SubmitButton>
        </form>
      )}
    </div>
  );
}
