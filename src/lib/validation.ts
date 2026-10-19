// Shared validation used by both the browser forms (instant feedback) and the server actions (the real check).

export const PHONE_RE = /^(03[0-9]{9}|\+923[0-9]{9})$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalisePhone(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

export type PasswordCheck = { label: string; ok: boolean };

export function passwordChecks(pw: string): PasswordCheck[] {
  return [
    { label: "At least 8 characters", ok: pw.length >= 8 },
    { label: "A letter", ok: /[A-Za-z]/.test(pw) },
    { label: "A number", ok: /[0-9]/.test(pw) },
  ];
}

/** 0 = empty, 1 = weak, 2 = fair, 3 = good, 4 = strong */
export function passwordScore(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Za-z]/.test(pw) && /[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) s++;
  return Math.max(1, Math.min(4, s));
}

export function passwordError(pw: string): string | null {
  const failed = passwordChecks(pw).find((c) => !c.ok);
  return failed ? `Password needs: ${failed.label.toLowerCase()}` : null;
}

/** Only allow same-site relative redirects such as "/wallet" (blocks "//evil.com" and "https://..."). */
export function safeNext(raw: unknown, fallback = "/"): string {
  const v = typeof raw === "string" ? raw : "";
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return fallback;
  return v;
}

/** Turns Supabase auth error text into something a player understands. */
export function friendlyAuthError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. We can send the link again.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("same_password") || m.includes("different from the old"))
    return "New password must be different from your current one.";
  if (m.includes("weak") || m.includes("password should")) return "Please choose a stronger password.";
  if (m.includes("expired") || m.includes("invalid") && m.includes("token")) return "This link has expired. Please request a new one.";
  return message || "Something went wrong. Please try again.";
}
