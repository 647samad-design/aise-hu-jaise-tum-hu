"use client";

import { useState, useTransition } from "react";
import { reviewTopup } from "@/app/actions";
import { pkr, shortDate } from "@/lib/format";

type Props = {
  id: number;
  amount: number;
  trxId: string;
  method: string;
  senderName: string | null;
  createdAt: string;
  userName: string | null;
  userPhone: string | null;
  userEmail: string | null;
};

export default function AdminTopupRow(p: Props) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function act(approve: boolean) {
    const note = approve ? "" : window.prompt("Reason for rejecting (shown to the user):") ?? "";
    if (!approve && note === "") return;
    start(async () => {
      const r = await reviewTopup(p.id, approve, note);
      if (r.ok) setDone(approve ? "Approved" : "Rejected");
      else setErr(r.message ?? "Failed");
    });
  }

  if (done) return <li className="py-3 text-sm text-pine-900/60">#{p.id}: {done}</li>;

  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-lg font-bold">{pkr(p.amount)}</p>
        <p className="text-xs text-pine-900/60">{shortDate(p.createdAt)}</p>
      </div>
      <p className="text-sm">
        <b>{p.userName ?? "No name"}</b> · {p.userPhone ?? "no phone"} · {p.userEmail}
      </p>
      <p className="text-sm">
        {p.method} · sender: {p.senderName ?? "—"} · TRX <code className="rounded bg-pine-50 px-1.5 py-0.5">{p.trxId}</code>
      </p>
      <div className="flex gap-2">
        <button disabled={pending} onClick={() => act(true)} className="btn-primary !py-2">Approve & credit</button>
        <button disabled={pending} onClick={() => act(false)} className="btn-ghost !py-2">Reject</button>
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}
    </li>
  );
}
