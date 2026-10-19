import { createClient } from "@/lib/supabase/server";
import type { Draw } from "@/lib/format";

// Public pages stay available when the data service is not configured or reachable.
export async function getPublicDraws(completed = false): Promise<{ draws: Draw[]; unavailable: boolean }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { draws: [], unavailable: true };
  }
  try {
    const client = await createClient();
    const { data, error } = await client.from("draws").select("*")
      .in("status", completed ? ["drawn"] : ["open", "full"])
      .order(completed ? "drawn_at" : "created_at", { ascending: false }).limit(50);
    return { draws: (data ?? []) as Draw[], unavailable: Boolean(error) };
  } catch {
    return { draws: [], unavailable: true };
  }
}

export type PublicStats = { players: number; entries: number; completed: number; delivered: number; refunded: number };

export async function getPublicStats(): Promise<PublicStats | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("public_stats");
    return error ? null : (data as PublicStats);
  } catch {
    return null;
  }
}
