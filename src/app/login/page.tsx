"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function google() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setMsg({ ok: false, text: error.message });
      setBusy(false);
    }
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Check your email for the sign-in link." });
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-sm space-y-5 pt-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-pine-800">Welcome to 1Rupya</h1>
        <p className="mt-1 text-sm text-pine-900/70">Sign in to buy tickets and track your wallet.</p>
      </div>

      <div className="card space-y-4 p-5">
        <button onClick={google} disabled={busy} className="btn-primary w-full">
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-xs text-pine-900/50">
          <span className="h-px flex-1 bg-pine-200" /> or <span className="h-px flex-1 bg-pine-200" />
        </div>

        <form onSubmit={magicLink} className="space-y-3">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@gmail.com"
            />
          </div>
          <button disabled={busy} className="btn-ghost w-full">Email me a sign-in link</button>
        </form>

        {msg && (
          <p className={`rounded-xl p-3 text-sm ${msg.ok ? "bg-pine-50 text-pine-800" : "bg-red-50 text-red-700"}`}>
            {msg.text}
          </p>
        )}
      </div>

      <p className="text-center text-xs text-pine-900/60">
        By signing in you confirm you are 18+ and accept that tickets are non-refundable once a draw is complete.
      </p>
    </div>
  );
}
