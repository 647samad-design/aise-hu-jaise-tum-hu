"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import {
  authErrorKey,
  EMAIL_RE,
  PHONE_RE,
  normalisePhone,
  passwordError,
  safeNext,
} from "@/lib/validation";

export type AuthState = {
  ok: boolean;
  message?: string;
  /** Field-level errors keyed by input name. */
  fields?: Record<string, string>;
  /** Echo back what the user typed so the form keeps it after a failed submit. */
  values?: Record<string, string>;
  /** Special UI states. */
  kind?: "check-email" | "unconfirmed" | "sent";
  email?: string;
};

async function siteOrigin() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return env ?? "http://localhost:3000";
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ------------------------------------------------------------------ sign in

export async function signInWithPassword(_prev: AuthState | null, fd: FormData): Promise<AuthState> {
  const t = await getT();
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = safeNext(fd.get("next"));
  const values = { email };

  const fields: Record<string, string> = {};
  if (!EMAIL_RE.test(email)) fields.email = t("e_email");
  if (!password) fields.password = t("e_pw_enter");
  if (Object.keys(fields).length) return { ok: false, fields, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const unconfirmed = error.message.toLowerCase().includes("not confirmed");
    return {
      ok: false,
      message: t(authErrorKey(error.message)),
      values,
      kind: unconfirmed ? "unconfirmed" : undefined,
      email,
    };
  }

  revalidatePath("/", "layout");
  // New players still need a phone number before they can buy tickets.
  if (data.user) {
    const { data: p } = await supabase.from("profiles").select("phone").eq("id", data.user.id).single();
    if (!p?.phone) redirect(`/profile?welcome=1&next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

// ------------------------------------------------------------------ magic link (passwordless)

export async function sendMagicLink(_prev: AuthState | null, fd: FormData): Promise<AuthState> {
  const t = await getT();
  const email = str(fd, "email").toLowerCase();
  const next = safeNext(fd.get("next"));
  if (!EMAIL_RE.test(email)) return { ok: false, fields: { email: t("e_email") }, values: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: false,
    },
  });
  // Don't reveal whether the email has an account.
  if (error && !error.message.toLowerCase().includes("signups not allowed")) {
    return { ok: false, message: t(authErrorKey(error.message)), values: { email } };
  }
  return { ok: true, kind: "sent", email, message: t("ok_link_sent") };
}

// ------------------------------------------------------------------ sign up

export async function signUp(_prev: AuthState | null, fd: FormData): Promise<AuthState> {
  const t = await getT();
  const full_name = str(fd, "full_name").replace(/\s+/g, " ");
  const email = str(fd, "email").toLowerCase();
  const phone = normalisePhone(str(fd, "phone"));
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const adult = fd.get("adult") === "on";
  const next = safeNext(fd.get("next"));
  const values = { full_name, email, phone };

  const fields: Record<string, string> = {};
  if (full_name.length < 3) fields.full_name = t("e_name");
  if (!EMAIL_RE.test(email)) fields.email = t("e_email");
  if (!PHONE_RE.test(phone)) fields.phone = t("e_phone");
  if (passwordError(password)) fields.password = t("e_pw_weak");
  // The confirm box is optional (the sign-up form uses show/hide instead); check it only when sent.
  if (!fields.password && fd.has("confirm") && password !== confirm) fields.confirm = t("e_pw_match");
  if (!adult) fields.adult = t("e_adult");
  if (Object.keys(fields).length) return { ok: false, fields, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { full_name, phone },
    },
  });
  if (error) return { ok: false, message: t(authErrorKey(error.message)), values };

  // With email confirmation ON, Supabase returns a user with no identities when the email is already taken.
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return { ok: false, message: t("e_exists"), values };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next === "/" ? "/?welcome=1" : next);
  }
  return { ok: true, kind: "check-email", email };
}

export async function resendConfirmation(email: string): Promise<AuthState> {
  const t = await getT();
  if (!EMAIL_RE.test(email)) return { ok: false, message: t("e_email") };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback` },
  });
  if (error) return { ok: false, message: t(authErrorKey(error.message)) };
  return { ok: true, message: t("ok_resent") };
}

// ------------------------------------------------------------------ password reset

export async function requestPasswordReset(_prev: AuthState | null, fd: FormData): Promise<AuthState> {
  const t = await getT();
  const email = str(fd, "email").toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, fields: { email: t("e_email") }, values: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error && error.message.toLowerCase().includes("rate")) {
    return { ok: false, message: t(authErrorKey(error.message)), values: { email } };
  }
  // Same answer whether or not the account exists.
  return { ok: true, kind: "sent", email };
}

/** Used both by /reset-password (after the email link) and by "Change password" in account settings. */
export async function updatePassword(_prev: AuthState | null, fd: FormData): Promise<AuthState> {
  const t = await getT();
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const after = fd.get("after") === "stay" ? null : safeNext(fd.get("next"), "/");

  if (passwordError(password)) return { ok: false, fields: { password: t("e_pw_weak") } };
  if (password !== confirm) return { ok: false, fields: { confirm: t("e_pw_match") } };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: t("e_reset_expired") };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: t(authErrorKey(error.message)) };

  if (after) redirect(`${after}${after.includes("?") ? "&" : "?"}password=updated`);
  return { ok: true, message: t("ok_pw") };
}
