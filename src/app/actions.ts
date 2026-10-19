"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  return { ok: true, message: "Profile saved" };
}

export async function submitTopup(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_topup", {
    p_amount: Number(formData.get("amount")),
    p_trx_id: String(formData.get("trx_id") ?? ""),
    p_method: String(formData.get("method") ?? "easypaisa"),
    p_sender_name: String(formData.get("sender_name") ?? ""),
  });
  if (error) return fail(error);
  revalidatePath("/wallet");
  return { ok: true, message: "Submitted. We will credit your wallet after verifying the payment." };
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

export async function reviewTopup(id: number, approve: boolean, note: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_topup", {
    p_topup_id: id,
    p_approve: approve,
    p_note: note || null,
  });
  if (error) return fail(error);
  revalidatePath("/admin");
  return { ok: true };
}

export async function createDraw(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const endsRaw = String(formData.get("ends_at") ?? "");
  const { error } = await supabase.rpc("create_draw", {
    p_title: String(formData.get("title") ?? ""),
    p_description: String(formData.get("description") ?? ""),
    p_image_url: String(formData.get("image_url") ?? ""),
    p_ticket_price: Number(formData.get("ticket_price")),
    p_target: Number(formData.get("target")),
    p_max_per_user: Number(formData.get("max_per_user") || 0),
    p_ends_at: endsRaw ? new Date(endsRaw).toISOString() : null,
  });
  if (error) return fail(error);
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, message: "Draw created. Its seed hash is now public." };
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
