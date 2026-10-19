"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";
import { emailConfigured, layout, sendEmails, type Mail } from "@/lib/email";

export type ActionResult = { ok: boolean; message?: string };

function fail(error: { message: string } | null): ActionResult {
  // Postgres "raise exception" text is already written for humans.
  return { ok: false, message: error?.message ?? "Something went wrong" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ------------------------------------------------------------------ user actions

export async function saveProfile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_profile", {
    p_full_name: String(formData.get("full_name") ?? ""),
    p_phone: String(formData.get("phone") ?? "").replace(/[\s-]/g, ""),
  });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  // First-time setup: send the player back to where they were heading.
  const next = formData.get("next");
  if (typeof next === "string" && next) redirect(safeNext(next));
  return { ok: true, message: "Profile saved" };
}

export type PaymentInput = {
  amount: number;
  trxId: string;
  method: string;
  senderName: string;
  screenshotPath: string;
  screenshotSha: string;
  drawId?: string | null;
  qty?: number | null;
};

/** Player submits payment proof (screenshot already uploaded to their private folder). */
export async function submitPayment(input: PaymentInput): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_topup", {
    p_amount: Math.round(Number(input.amount)),
    p_trx_id: input.trxId,
    p_method: ["easypaisa", "jazzcash", "bank", "other"].includes(input.method) ? input.method : "other",
    p_sender_name: input.senderName,
    p_screenshot_path: input.screenshotPath,
    p_screenshot_sha: input.screenshotSha,
    p_draw: input.drawId || null,
    p_qty: input.drawId ? input.qty ?? null : null,
  });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: input.drawId
      ? "Payment submitted! We are checking it now. As soon as it is confirmed you are entered in the draw and we email you."
      : "Payment submitted! We credit your wallet as soon as we confirm it.",
  };
}

export async function buyTickets(drawId: string, qty: number): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buy_tickets", { p_draw: drawId, p_qty: qty });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  const r = data as { first: number; last: number; cost: number };
  return {
    ok: true,
    message:
      r.first === r.last
        ? `Ticket #${r.first} is yours. Good luck!`
        : `Tickets #${r.first} to #${r.last} are yours. Good luck!`,
  };
}

// ------------------------------------------------------------------ admin actions

type ReviewResult = {
  approved: boolean;
  user_id: string;
  entered?: boolean;
  amount?: number;
  first?: string;
  last?: string;
  title?: string;
  draw_id?: string;
  error?: string;
};

export async function reviewTopup(id: number, approve: boolean, note: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("review_topup", {
    p_topup_id: id,
    p_approve: approve,
    p_note: note || null,
  });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  const r = data as ReviewResult;

  // Email the player (admins can read profiles).
  let emailNote = "";
  if (emailConfigured()) {
    const { data: p } = await supabase.from("profiles").select("email, full_name").eq("id", r.user_id).single();
    if (p?.email) {
      const hi = `Hi ${(p.full_name ?? "").split(" ")[0] || "there"},`;
      const tickets = r.first && r.last ? (r.first === r.last ? `Ticket #${r.first}` : `Tickets #${r.first} to #${r.last}`) : "";
      const mail = !r.approved
        ? layout({
            title: "We could not confirm your payment",
            lines: [hi, note ? `Reason: ${note}` : "We could not match your payment to our records.", "If you did pay, reply to this email or contact support with your screenshot and we will sort it out."],
            button: { label: "Open your wallet", href: "/wallet" },
          })
        : r.entered
          ? layout({
              title: `You're in! ${r.title ?? "Lucky draw"}`,
              highlight: tickets,
              lines: [hi, `Your payment of PKR ${r.amount} is confirmed and you are now participating in ${r.title}.`, "When every ticket is sold the winner is drawn, and you'll get an email with the result. Good luck!"],
              button: { label: "See your tickets", href: r.draw_id ? `/draws/${r.draw_id}` : "/tickets" },
            })
          : layout({
              title: `PKR ${r.amount} added to your wallet`,
              lines: [hi, r.error ? `Your payment is confirmed. We couldn't enter you automatically (${r.error}), so the money is safe in your wallet — use it on any open draw.` : "Your payment is confirmed. You can now buy tickets in any open draw."],
              button: { label: "Choose a draw", href: "/#draws" },
            });
      const subject = !r.approved ? "Payment not confirmed — 1Rupya" : r.entered ? `You're in: ${r.title}` : `PKR ${r.amount} added to your 1Rupya wallet`;
      const res = await sendEmails([{ to: p.email, subject, ...mail }]);
      emailNote = res.sent ? " Email sent." : ` (Email failed: ${res.error})`;
    }
  }
  const base = !r.approved ? "Rejected." : r.entered ? `Approved and entered (${r.first === r.last ? `#${r.first}` : `#${r.first}–#${r.last}`}).` : r.error ? `Approved — ${r.error}; money kept in wallet.` : "Approved — wallet credited.";
  return { ok: true, message: base + emailNote };
}

// ------------------------------------------------------------------ admin: draw details, delivery, settings, emails

export type DrawDetails = { title: string; description: string; imageUrl: string; gallery: string[]; facts: string[]; prizeValue: number | null };

export async function saveDrawDetails(drawId: string, d: DrawDetails): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_draw_details", {
    p_draw: drawId,
    p_title: d.title,
    p_description: d.description,
    p_image_url: d.imageUrl,
    p_gallery: d.gallery,
    p_facts: d.facts,
    p_prize_value: d.prizeValue ?? 0,
  });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function setDeliveryProof(drawId: string, image: string, note: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_delivery_proof", { p_draw: drawId, p_image: image, p_note: note });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Marked as delivered. It now shows on Winners." };
}

const SETTING_KEYS = ["pay_qr_url", "pay_account_name", "pay_easypaisa", "pay_jazzcash", "pay_bank", "support_whatsapp", "min_topup"] as const;

export async function saveSettings(values: Record<string, string>): Promise<ActionResult> {
  const supabase = await createClient();
  for (const key of SETTING_KEYS) {
    if (!(key in values)) continue;
    const { error } = await supabase.rpc("admin_set_setting", { p_key: key, p_value: values[key] ?? "" });
    if (error) return fail(error);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved. Players see the new payment details right away." };
}

/** Emails everyone holding a ticket in this draw: the result (if drawn) or a progress update. */
export async function emailParticipants(drawId: string): Promise<ActionResult> {
  const supabase = await createClient();
  if (!emailConfigured()) return { ok: false, message: "Email is not set up yet. Add RESEND_API_KEY and EMAIL_FROM (see README)." };

  const { data: draw } = await supabase.from("draws").select("id, title, status, winner_ticket, winner_label, winner_user_id, sold_tickets, target_tickets, participants").eq("id", drawId).single();
  if (!draw) return { ok: false, message: "Draw not found" };

  type Row = { user_id: string; number: number; profiles: { email: string | null; full_name: string | null } | null };
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("tickets")
      .select("user_id, number, profiles(email, full_name)")
      .eq("draw_id", drawId)
      .order("number")
      .range(from, from + 999);
    if (error) return fail(error);
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < 1000) break;
  }
  const people = new Map<string, { email: string; name: string; numbers: number[] }>();
  for (const r of rows) {
    if (!r.profiles?.email) continue;
    const p = people.get(r.user_id) ?? { email: r.profiles.email, name: (r.profiles.full_name ?? "").split(" ")[0] || "there", numbers: [] };
    p.numbers.push(r.number);
    people.set(r.user_id, p);
  }
  if (!people.size) return { ok: false, message: "No participants with an email yet." };

  const mails: Mail[] = [...people.entries()].map(([uid, p]) => {
    const yours = p.numbers.sort((a, b) => a - b).map((n) => `#${n}`).join(", ");
    if (draw.status === "drawn") {
      const won = uid === draw.winner_user_id;
      const m = layout({
        title: won ? `You won ${draw.title}!` : `Result: ${draw.title}`,
        highlight: `Winning ticket #${draw.winner_ticket} — ${draw.winner_label}`,
        lines: won
          ? [`Hi ${p.name},`, `Congratulations! Your ticket #${draw.winner_ticket} was drawn. We will call you on your registered number to arrange your prize.`, `Your tickets: ${yours}`]
          : [`Hi ${p.name},`, `The draw is complete. This time the prize goes to ${draw.winner_label}. Thank you for taking part!`, `Your tickets: ${yours}`, "Anyone can re-check this result with the public proof — open the link below."],
        button: { label: won ? "See your win" : "Verify the result", href: `/verify/${draw.id}` },
      });
      return { to: p.email, subject: won ? `🎉 You won ${draw.title}!` : `Result: ${draw.title} — winning ticket #${draw.winner_ticket}`, ...m };
    }
    const m = layout({
      title: draw.status === "full" ? `Sold out: ${draw.title}` : `Update: ${draw.title}`,
      highlight: `${draw.sold_tickets} / ${draw.target_tickets} tickets · ${draw.participants} participants`,
      lines: [
        `Hi ${p.name},`,
        draw.status === "full" ? "Every ticket is sold! The winner will be drawn shortly and you'll get the result by email." : "You're participating in this draw. Share it with friends — the winner is drawn as soon as every ticket sells.",
        `Your tickets: ${yours}`,
      ],
      button: { label: "Open the draw", href: `/draws/${draw.id}` },
    });
    return { to: p.email, subject: draw.status === "full" ? `Sold out: ${draw.title}` : `You're in ${draw.title} — progress update`, ...m };
  });

  const res = await sendEmails(mails);
  if (res.sent) await supabase.rpc("log_email", { p_draw: drawId, p_kind: draw.status === "drawn" ? "result" : "update", p_recipients: res.sent });
  revalidatePath("/admin");
  return res.error ? { ok: res.sent > 0, message: `Sent ${res.sent} of ${mails.length}. ${res.error}` } : { ok: true, message: `Email sent to ${res.sent} participant${res.sent === 1 ? "" : "s"}.` };
}

export async function createDraw(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const endsRaw = String(formData.get("ends_at") ?? "");
  const opensRaw = String(formData.get("opens_at") ?? "");
  const { data: newId, error } = await supabase.rpc("create_draw", {
    p_title: String(formData.get("title") ?? ""),
    p_description: String(formData.get("description") ?? ""),
    p_image_url: String(formData.get("image_url") ?? ""),
    p_ticket_price: Number(formData.get("ticket_price")),
    p_target: Number(formData.get("target")),
    p_max_per_user: Number(formData.get("max_per_user") || 0),
    p_ends_at: pktToIso(endsRaw),
    p_opens_at: pktToIso(opensRaw),
  });
  if (error) return fail(error);
  const gallery = formData.getAll("gallery").map(String).filter(Boolean);
  const facts = String(formData.get("facts") ?? "").split("\n").map((f) => f.trim()).filter(Boolean);
  const prize = Number(formData.get("prize_value") || 0);
  if (gallery.length || facts.length || prize) {
    const { error: e2 } = await supabase.rpc("update_draw_details", {
      p_draw: newId,
      p_title: String(formData.get("title") ?? ""),
      p_description: String(formData.get("description") ?? ""),
      p_image_url: String(formData.get("image_url") ?? ""),
      p_gallery: gallery,
      p_facts: facts,
      p_prize_value: prize,
    });
    if (e2) return { ok: false, message: `Draw created, but details failed: ${e2.message}` };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Draw created and announced to all players. Its seed hash is now public." };
}

// <input type="datetime-local"> has no time zone. The admin types Pakistan time, but the server runs in UTC.
function pktToIso(raw: string): string | null {
  if (!raw) return null;
  const d = new Date(`${raw.length === 16 ? `${raw}:00` : raw}+05:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function announce(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_announce", {
    p_title: String(formData.get("title") ?? ""),
    p_body: String(formData.get("body") ?? ""),
    p_link: String(formData.get("link") ?? ""),
  });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  if (formData.get("email") !== "on") return { ok: true, message: "Sent. Every player will see it in their notifications." };
  if (!emailConfigured()) return { ok: true, message: "Notification sent. Email is not set up yet, so no emails went out." };
  const players: { email: string | null; full_name: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from("profiles").select("email, full_name").not("email", "is", null).order("created_at").range(from, from + 999);
    players.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "");
  const link = String(formData.get("link") ?? "") || "/#draws";
  const mails: Mail[] = (players ?? []).filter((p) => p.email).map((p) => ({
    to: p.email as string,
    subject: title,
    ...layout({ title, lines: [`Hi ${(p.full_name ?? "").split(" ")[0] || "there"},`, ...(body ? [body] : [])], button: { label: "Open 1Rupya", href: link } }),
  }));
  const res = await sendEmails(mails);
  if (res.sent) await supabase.rpc("log_email", { p_draw: null, p_kind: "announcement", p_recipients: res.sent });
  return { ok: !res.error, message: `Notification sent. Email: ${res.sent} of ${mails.length} delivered${res.error ? ` — ${res.error}` : "."}` };
}

export async function markNotificationsSeen(): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("mark_notifications_seen");
  revalidatePath("/", "layout");
}

// Public randomness from the drand network, mixed into the result so even the admin
// cannot know the outcome in advance. If drand is unreachable the draw still works
// (seed + ticket list only) and the proof shows an empty beacon.
async function fetchBeacon(): Promise<string> {
  try {
    const res = await fetch("https://api.drand.sh/v2/beacons/quicknet/rounds/latest", {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return "";
    const j = (await res.json()) as { round?: number; randomness?: string };
    return j.round && j.randomness ? `drand-quicknet:${j.round}:${j.randomness}` : "";
  } catch {
    return "";
  }
}

export async function runDraw(drawId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const beacon = await fetchBeacon();
  const { error } = await supabase.rpc("draw_winner", { p_draw: drawId, p_beacon: beacon });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Winner drawn." };
}

export async function cancelDraw(drawId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_draw", { p_draw: drawId });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true, message: `Cancelled. ${data ?? 0} players refunded.` };
}
