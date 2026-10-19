"use client";

import { useState, useTransition } from "react";
import { reviewTopup } from "@/app/actions";
import { pkr, shortDate } from "@/lib/format";

export type AdminPayment = {
  id: number;
  amount: number;
  trx_id: string;
  method: string;
  sender_name: string | null;
  created_at: string;
  qty: number | null;
  screenshot: string | null;
  draw: { id: string; title: string; ticket_price: number } | null;
  user: { full_name: string | null; phone: string | null; email: string | null } | null;
};

const REASONS = ["Payment not received", "Amount doesn't match", "Screenshot unclear / edited", "Duplicate payment"];

export default function PaymentRow({ p }: { p: AdminPayment }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [zoom, setZoom] = useState(false);

  const expected = p.draw && p.qty ? p.qty * p.draw.ticket_price : null;
  const mismatch = expected !== null && expected !== p.amount;
  const senderDiffers =
    !!p.sender_name &&
    !!p.user?.full_name &&
    !p.user.full_name.toLowerCase().split(" ").some((w) => w.length > 2 && p.sender_name!.toLowerCase().includes(w));

  function act(approve: boolean, note = "") {
    start(async () => {
      const r = await reviewTopup(p.id, approve, note);
      setMsg({ ok: r.ok, text: r.message ?? (r.ok ? "Done" : "Failed") });
    });
  }

  if (msg?.ok) return <li className="pay-row done"><b>#{p.id}</b> {msg.text}</li>;

  return (
    <li className="pay-row">
      <button type="button" className="pay-shot" onClick={() => setZoom(true)} disabled={!p.screenshot} aria-label="Open screenshot">
        {p.screenshot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.screenshot} alt="Payment screenshot" />
        ) : (
          <span>No screenshot</span>
        )}
      </button>
      <div className="pay-info">
        <div className="pay-top">
          <b className="pay-amt">{pkr(p.amount)}</b>
          <span className="pill pill-muted capitalize">{p.method}</span>
          {p.draw ? <span className="pill pill-gold">Join: {p.qty} × {p.draw.title}</span> : <span className="pill pill-green">Wallet top-up</span>}
          <span className="ml-auto text-xs text-pine-900/60">{shortDate(p.created_at)}</span>
        </div>
        <dl className="pay-dl">
          <div><dt>Paid from</dt><dd>{p.sender_name ?? "—"}{senderDiffers && <span className="flag"> · differs from profile name</span>}</dd></div>
          <div><dt>TID</dt><dd><code>{p.trx_id}</code></dd></div>
          <div><dt>Player</dt><dd>{p.user?.full_name ?? "—"} · {p.user?.phone ?? "no phone"}</dd></div>
          <div><dt>Email</dt><dd className="break-all">{p.user?.email ?? "—"}</dd></div>
        </dl>
        {mismatch && <p className="flag">Amount should be {pkr(expected!)} for {p.qty} ticket(s).</p>}
        {rejecting ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button key={r} type="button" className="chip" aria-pressed={reason === r} onClick={() => setReason(r)}>{r}</button>
              ))}
            </div>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (the player sees this)" />
            <div className="flex gap-2">
              <button className="btn-danger !py-2" disabled={pending || !reason.trim()} onClick={() => act(false, reason.trim())}>Reject &amp; notify</button>
              <button className="btn-ghost !py-2" onClick={() => setRejecting(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button disabled={pending} onClick={() => act(true)} className="btn-primary !py-2">
              {pending ? "Working…" : p.draw ? "Verified — approve & enter" : "Verified — approve & credit"}
            </button>
            <button disabled={pending} onClick={() => setRejecting(true)} className="btn-ghost !py-2">Reject</button>
          </div>
        )}
        {msg && !msg.ok && <p className="field-error">{msg.text}</p>}
      </div>
      {zoom && p.screenshot && (
        <div className="lightbox" role="dialog" aria-label="Payment screenshot" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.screenshot} alt="Payment screenshot full size" />
          <button aria-label="Close">×</button>
        </div>
      )}
    </li>
  );
}
