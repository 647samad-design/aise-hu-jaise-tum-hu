import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { EMAIL_SETUP_HINT, emailConfigured } from "@/lib/email";

export const metadata: Metadata = { title: "Setup check · 1Rupya", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Check = { name: string; ok: boolean; detail: string; fix?: string };

// Self-diagnosis for the site owner. Shows no secrets: only whether each setting works.
async function run(): Promise<Check[]> {
  const out: Check[] = [];
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();

  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    /* invalid */
  }
  const shapeOk = /^https:\/\/[a-z0-9]{10,}\.supabase\.co\/?$/.test(url);
  out.push({
    name: "Supabase URL format",
    ok: shapeOk,
    detail: url ? `Set to ${host || "(not a valid URL)"}${url.endsWith("/") ? " (has a trailing /)" : ""}` : "Not set",
    fix: shapeOk ? undefined : "Supabase → Project Settings → API (Data API) → copy “Project URL”. It must look exactly like https://abcdefghijkl.supabase.co — not the supabase.com/dashboard link, nothing after .co.",
  });

  out.push({
    name: "Supabase anon key",
    ok: key.length > 30 && !key.includes(" "),
    detail: key ? `${key.length} characters, starts with ${key.slice(0, 6)}…` : "Not set",
    fix: "Supabase → Project Settings → API Keys → copy the “anon public” (or “publishable”) key. Never the service_role / secret key.",
  });

  if (host) {
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, { headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(8000) });
      const type = res.headers.get("content-type") ?? "";
      const json = type.includes("json");
      out.push({
        name: "Sign-in service reachable",
        ok: res.ok && json,
        detail: `HTTP ${res.status}, ${json ? "JSON" : "a web page (wrong URL)"}`,
        fix: res.ok && json ? undefined : res.status === 401 ? "The anon key doesn't belong to this project." : "The URL doesn't point to a Supabase project API. Fix NEXT_PUBLIC_SUPABASE_URL and redeploy. If the project is paused, restore it in Supabase.",
      });
    } catch (e) {
      out.push({ name: "Sign-in service reachable", ok: false, detail: e instanceof Error ? e.message : "failed", fix: "Check the URL and that the Supabase project is not paused." });
    }

    try {
      const db = createClient(url, key, { auth: { persistSession: false } });
      const { error } = await db.from("app_settings").select("key").limit(1);
      out.push({
        name: "Database tables (schema.sql)",
        ok: !error,
        detail: error ? error.message : "Found",
        fix: error ? "Supabase → SQL Editor → paste the whole supabase/schema.sql → Run." : undefined,
      });
      // A missing file in an existing public bucket says "Object not found"; a missing bucket says "Bucket not found".
      const probe = await fetch(`${url.replace(/\/$/, "")}/storage/v1/object/public/public-images/__setup_check__`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      const body = (await probe.text()).toLowerCase();
      const bucketMissing = body.includes("bucket not found");
      out.push({
        name: "Storage for photos & screenshots",
        ok: !bucketMissing,
        detail: bucketMissing ? "Storage buckets not created yet" : "public-images bucket found",
        fix: bucketMissing ? "Run supabase/schema.sql again (it creates the storage buckets)." : undefined,
      });
    } catch (e) {
      out.push({ name: "Database tables (schema.sql)", ok: false, detail: e instanceof Error ? e.message : "failed" });
    }
  }

  const siteOk = /^https:\/\//.test(site) && !site.endsWith("/");
  out.push({
    name: "Site URL",
    ok: siteOk,
    detail: site || "Not set",
    fix: siteOk ? undefined : "Set NEXT_PUBLIC_SITE_URL to your live address, e.g. https://1rupya.netlify.app (no / at the end). Also add https://YOUR-SITE/auth/callback in Supabase → Authentication → URL Configuration → Redirect URLs.",
  });
  out.push({
    name: "Emails (Gmail)",
    ok: emailConfigured(),
    detail: emailConfigured() ? `EMAIL_HOST_USER and EMAIL_HOST_PASSWORD set (${process.env.EMAIL_HOST_USER})` : "Not set — the app works, but no emails are sent",
    fix: emailConfigured() ? undefined : EMAIL_SETUP_HINT,
  });
  return out;
}

export default async function SetupCheck() {
  const checks = await run();
  const bad = checks.filter((c) => !c.ok).length;
  return (
    <div className="page narrow">
      <header className="page-head">
        <p className="eyebrow">FOR THE SITE OWNER</p>
        <h1>Setup <em>check</em></h1>
        <p>{bad ? `${bad} thing${bad > 1 ? "s" : ""} to fix. After changing Netlify environment variables, always redeploy (Deploys → Trigger deploy → Clear cache and deploy).` : "Everything looks good."}</p>
      </header>
      <ul className="notif-list">
        {checks.map((c) => (
          <li key={c.name} className="notif">
            <div>
              <span className={`notif-icon ${c.ok ? "" : "k-refund"}`}>{c.ok ? "✓" : "!"}</span>
              <span className="notif-text">
                <span className="notif-title">{c.name}</span>
                <span className="notif-body">{c.detail}</span>
                {!c.ok && c.fix && <span className="notif-body"><b>Fix:</b> {c.fix}</span>}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
