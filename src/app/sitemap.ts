import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/winners`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/download`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return pages;
  try {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await db
      .from("draws")
      .select("id, status, created_at, drawn_at")
      .in("status", ["open", "full", "drawn"])
      .order("created_at", { ascending: false })
      .limit(500);
    for (const d of data ?? []) {
      const live = d.status !== "drawn";
      pages.push({
        url: `${SITE_URL}/draws/${d.id}`,
        lastModified: new Date(d.drawn_at ?? d.created_at),
        changeFrequency: live ? "hourly" : "monthly",
        priority: live ? 0.9 : 0.5,
      });
      if (!live) pages.push({ url: `${SITE_URL}/verify/${d.id}`, lastModified: new Date(d.drawn_at ?? d.created_at), changeFrequency: "yearly", priority: 0.3 });
    }
  } catch {
    /* sitemap still works without the draw list */
  }
  return pages;
}
