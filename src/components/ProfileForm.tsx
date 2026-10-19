"use client";

import { useActionState } from "react";
import { saveProfile, type ActionResult } from "@/app/actions";

export default function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveProfile, null);

  return (
    <form action={action} className="card space-y-4 p-5">
      <div>
        <label className="label" htmlFor="full_name">Full name</label>
        <input id="full_name" name="full_name" required defaultValue={fullName} className="input" />
        <p className="mt-1 text-xs text-pine-900/60">
          Use the same name as your EasyPaisa / JazzCash account so we can match your payments.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="phone">Mobile number</label>
        <input
          id="phone"
          name="phone"
          required
          inputMode="tel"
          defaultValue={phone}
          placeholder="03001234567"
          className="input"
        />
      </div>
      <button disabled={pending} className="btn-primary w-full">{pending ? "Saving..." : "Save profile"}</button>
      {state && (
        <p className={`rounded-xl p-3 text-sm ${state.ok ? "bg-pine-50 text-pine-800" : "bg-red-50 text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
