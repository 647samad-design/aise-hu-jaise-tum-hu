import "server-only";
import { SITE_URL } from "@/lib/site";

// Emails are sent with Resend (https://resend.com, free tier: 3,000/month, 100/day).
// Set RESEND_API_KEY and EMAIL_FROM (e.g. "1Rupya <draws@yourdomain.pk>" on a domain you verified in Resend).
// Without them the app still works; email buttons simply report that email is not set up.

export type Mail = { to: string; subject: string; html: string; text: string };

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendEmails(mails: Mail[]): Promise<{ sent: number; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { sent: 0, error: "Email is not set up (RESEND_API_KEY / EMAIL_FROM)." };
  let sent = 0;
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100).map((m) => ({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text }));
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { sent, error: `Email service said ${res.status}: ${body.slice(0, 160)}` };
      }
      sent += chunk.length;
    } catch (e) {
      return { sent, error: e instanceof Error ? e.message : "Email failed" };
    }
  }
  return { sent };
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
