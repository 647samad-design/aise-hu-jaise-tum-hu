"use client";

import { useActionState } from "react";
import { createDraw, type ActionResult } from "@/app/actions";

export default function AdminDrawForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createDraw, null);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="title">Product title</label>
        <input id="title" name="title" required className="input" placeholder="Smart Watch T800" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={2} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="image_url">Image URL</label>
        <input id="image_url" name="image_url" type="url" className="input" placeholder="https://..." />
      </div>
      <div>
        <label className="label" htmlFor="ticket_price">Ticket price (PKR)</label>
        <input id="ticket_price" name="ticket_price" type="number" min={1} max={100} defaultValue={2} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="target">Total tickets (target)</label>
        <input id="target" name="target" type="number" min={2} defaultValue={100} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="max_per_user">Max tickets per person</label>
        <input id="max_per_user" name="max_per_user" type="number" min={0} defaultValue={0} className="input" />
        <p className="mt-1 text-xs text-pine-900/60">0 = automatic (20% of total).</p>
      </div>
      <div>
        <label className="label" htmlFor="ends_at">Deadline (optional)</label>
        <input id="ends_at" name="ends_at" type="datetime-local" className="input" />
      </div>
      <div className="sm:col-span-2">
        <button disabled={pending} className="btn-primary w-full">{pending ? "Creating..." : "Create draw"}</button>
        {state && (
          <p className={`mt-2 rounded-xl p-3 text-sm ${state.ok ? "bg-pine-50 text-pine-800" : "bg-red-50 text-red-700"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
