import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";

// Handles every link that comes back from Supabase Auth:
//  * Google sign-in and PKCE email links  -> ?code=...
//  * Custom email templates using token_hash -> ?token_hash=...&type=signup|recovery|magiclink|email
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  let next = safeNext(searchParams.get("next"));

  const supabase = await createClient();
  let ok = false;

  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
    if (type === "recovery") next = "/reset-password";
  }

  if (!ok) {
    const dest = next === "/reset-password" ? "/forgot-password?error=expired" : "/login?error=link";
    return NextResponse.redirect(`${origin}${dest}`);
  }

  if (next === "/reset-password") return NextResponse.redirect(`${origin}/reset-password`);

  // New players add their phone before playing.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: p } = await supabase.from("profiles").select("phone").eq("id", user.id).single();
    if (!p?.phone) return NextResponse.redirect(`${origin}/profile?welcome=1&next=${encodeURIComponent(next)}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
