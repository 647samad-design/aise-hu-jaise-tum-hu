import "server-only";
import { SITE_URL } from "@/lib/site";

// Emails are sent through your own Gmail account (SMTP).
// Env vars (server-only — never NEXT_PUBLIC_):
//   EMAIL_HOST_USER      your Gmail address, e.g. you@gmail.com
//   EMAIL_HOST_PASSWORD  a 16-letter Google *App Password* (not your normal Gmail password)
//   DEFAULT_FROM_EMAIL   optional, e.g. "1Rupya <you@gmail.com>" (must be the same Gmail address)
//   EMAIL_HOST / EMAIL_PORT  optional, default smtp.gmail.com / 465 (works for any SMTP provider)
// Gmail allows roughly 500 emails a day from a normal account.
// Without these the app still works; email buttons simply report that email is not set up.

import nodemailer from "nodemailer";

export type Mail = { to: string; subject: string; html: string; text: string };

const user = () => (process.env.EMAIL_HOST_USER ?? "").trim();
const pass = () => (process.env.EMAIL_HOST_PASSWORD ?? "").replace(/\s+/g, ""); // Google shows app passwords with spaces

export const emailConfigured = () => Boolean(user() && pass());

export const EMAIL_SETUP_HINT = "Add EMAIL_HOST_USER and EMAIL_HOST_PASSWORD (Gmail app password) in Netlify environment variables, then redeploy.";

export async function sendEmails(mails: Mail[]): Promise<{ sent: number; error?: string }> {
  if (!emailConfigured()) return { sent: 0, error: `Email is not set up. ${EMAIL_SETUP_HINT}` };
  const port = Number(process.env.EMAIL_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: user(), pass: pass() },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  const from = process.env.DEFAULT_FROM_EMAIL?.trim() || `1Rupya <${user()}>`;
  let sent = 0;
  let error: string | undefined;
  try {
    // Small batches in parallel: fast enough for a few hundred players, gentle on Gmail.
    for (let i = 0; i < mails.length; i += 5) {
      const batch = mails.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map((m) => transport.sendMail({ from, to: m.to, subject: m.subject, html: m.html, text: m.text })),
      );
      for (const r of results) {
        if (r.status === "fulfilled") sent++;
        else error ??= friendly(r.reason);
      }
      if (error && sent === 0 && i === 0) break; // wrong password etc. — don't hammer Gmail
    }
  } finally {
    transport.close();
  }
  return error ? { sent, error } : { sent };
}

function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/535|Username and Password not accepted|Invalid login/i.test(m))
    return "Gmail rejected the login. Use a Google App Password (Google Account → Security → App passwords), not your normal password.";
  if (/limit|quota|550 5\.4\.5/i.test(m)) return "Gmail's daily sending limit was reached. Try again tomorrow.";
  if (/timeout|ETIMEDOUT|ECONNREFUSED/i.test(m)) return "Couldn't reach Gmail. Please try again.";
  return m.slice(0, 200);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Branded, mobile-friendly email. `lines` are plain text paragraphs (escaped). */
export function layout(opts: { title: string; lines: string[]; button?: { label: string; href: string }; highlight?: string }): { html: string; text: string } {
  const href = opts.button ? (opts.button.href.startsWith("http") ? opts.button.href : `${SITE_URL}${opts.button.href}`) : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f8f8f3;font-family:Arial,Helvetica,sans-serif;color:#183f30">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f3;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e3e8e0">
<tr><td style="background:#103f34;padding:22px 26px;color:#faf8ed;font-size:22px;font-weight:bold"><span style="display:inline-block;background:#e8cf94;color:#103f34;border-radius:8px 2px 8px 2px;padding:2px 9px;margin-right:6px;font-family:Georgia,serif">1</span>Rupya</td></tr>
<tr><td style="padding:28px 26px 8px"><h1 style="margin:0 0 14px;font-family:Georgia,serif;font-weight:normal;font-size:26px;line-height:1.25;color:#103f34">${esc(opts.title)}</h1>
${opts.highlight ? `<div style="background:#f6f1e4;border:1px solid #ecdcb6;border-radius:10px;padding:14px 16px;margin:0 0 16px;font-size:16px;font-weight:bold;color:#4e3d18">${esc(opts.highlight)}</div>` : ""}
${opts.lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#33503f">${esc(l)}</p>`).join("")}
${opts.button ? `<p style="margin:22px 0 8px"><a href="${esc(href)}" style="display:inline-block;background:#e8cf94;color:#103f34;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:8px">${esc(opts.button.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:18px 26px 24px;font-size:12px;line-height:1.6;color:#7b887f;border-top:1px solid #eef1ea">18+ only. Every result can be verified on the draw's page.<br>You get this email because you have a 1Rupya account.</td></tr>
</table></td></tr></table></body></html>`;
  const text = [opts.title, opts.highlight ?? "", ...opts.lines, opts.button ? `${opts.button.label}: ${href}` : ""].filter(Boolean).join("\n\n");
  return { html, text };
}
