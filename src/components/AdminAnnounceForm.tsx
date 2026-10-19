"use client";

import { useActionState } from "react";
import { announce, type ActionResult } from "@/app/actions";

export default function AdminAnnounceForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(announce, null);
  return (
    <form key={state?.ok ? Date.now() : "f"} action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="ann_title">Title</label>
        <input id="ann_title" name="title" required maxLength={120} className="input" placeholder="Next lucky draw opens Friday 9 PM" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="ann_body">Message (optional)</label>
        <textarea id="ann_body" name="body" rows={2} maxLength={600} className="input" placeholder="Prize: Samsung A15. Tickets PKR 2. Set a reminder!" />
      </div>
      <div>
        <label className="label" htmlFor="ann_link">Link (optional)</label>
        <input id="ann_link" name="link" className="input" placeholder="/#draws" />
      </div>
      <label className="check-row sm:col-span-2">
        <input type="checkbox" name="email" />
        <span>Also send as <b>email</b> to every player (needs email set up). Use for big news like a new draw opening.</span>
      </label>
      <div className="flex items-end">
        <button disabled={pending} className="btn-gold w-full">{pending ? "Sending…" : "Send to all players"}</button>
      </div>
      {state && (
        <p className={`sm:col-span-2 rounded-xl p-3 text-sm ${state.ok ? "bg-pine-50 text-pine-800" : "bg-red-50 text-red-700"}`}>{state.message}</p>
      )}
    </form>
  );
}
