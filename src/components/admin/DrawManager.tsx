"use client";

import { useState, useTransition } from "react";
import { emailParticipants, saveDrawDetails, setDeliveryProof, type ActionResult } from "@/app/actions";
import ImageUploader from "@/components/admin/ImageUploader";
import { shortDate, type Draw } from "@/lib/format";

type Props = { draw: Draw; lastEmail: { kind: string; recipients: number; created_at: string } | null; emailReady: boolean };

/** Per-draw tools: edit photos/facts, email participants, publish prize delivery. */
export default function DrawManager({ draw, lastEmail, emailReady }: Props) {
  const [open, setOpen] = useState<"details" | "delivery" | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionResult | null>(null);

  const [images, setImages] = useState<string[]>([draw.image_url ?? "", ...(draw.gallery ?? [])].filter(Boolean));
  const [title, setTitle] = useState(draw.title);
  const [desc, setDesc] = useState(draw.description ?? "");
  const [facts, setFacts] = useState((draw.facts ?? []).join("\n"));
  const [value, setValue] = useState(draw.prize_value ? String(draw.prize_value) : "");
  const [deliv, setDeliv] = useState<string[]>(draw.delivery_image ? [draw.delivery_image] : []);
  const [note, setNote] = useState(draw.delivery_note ?? "");

  const emailLabel = draw.status === "drawn" ? "Email result to all participants" : "Email update to participants";

  return (
    <div className="manager">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost !py-2" onClick={() => setOpen(open === "details" ? null : "details")}>
          {open === "details" ? "Close" : "Edit photos & details"}
        </button>
        {(draw.participants ?? 0) > 0 && (
          <button
            type="button"
            className="btn-gold !py-2"
            disabled={pending}
            title={emailReady ? undefined : "Set EMAIL_HOST_USER and EMAIL_HOST_PASSWORD first"}
            onClick={() => {
              const again = lastEmail && lastEmail.kind === (draw.status === "drawn" ? "result" : "update");
              if (!window.confirm(`${again ? "You already sent this email. Send again? " : ""}Send to ${draw.participants} participant(s)?`)) return;
              start(async () => setMsg(await emailParticipants(draw.id)));
            }}
          >
            ✉ {emailLabel}
          </button>
        )}
        {draw.status === "drawn" && (
          <button type="button" className="btn-ghost !py-2" onClick={() => setOpen(open === "delivery" ? null : "delivery")}>
            {draw.delivered_at ? "Edit delivery proof" : "Mark prize delivered"}
          </button>
        )}
      </div>
      {lastEmail && (
        <p className="text-xs text-pine-900/60">
          Last email: {lastEmail.kind} to {lastEmail.recipients} on {shortDate(lastEmail.created_at)}
        </p>
      )}
      {!emailReady && (draw.participants ?? 0) > 0 && <p className="text-xs text-pine-900/60">Email isn&apos;t set up yet — see README “Emails”.</p>}

      {open === "details" && (
        <div className="manager-panel space-y-3">
          <ImageUploader value={images} onChange={setImages} folder="draws" />
          <div>
            <label className="label">Title {draw.sold_tickets > 0 && <span className="text-xs font-normal">(locked — tickets sold)</span>}</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} disabled={draw.sold_tickets > 0} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div>
            <label className="label">Facts / specs (one per line, “Label: value”)</label>
            <textarea className="input" rows={4} value={facts} onChange={(e) => setFacts(e.target.value)} />
          </div>
          <div>
            <label className="label">Market value (PKR)</label>
            <input className="input" type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <button
            type="button"
            className="btn-primary w-full"
            disabled={pending}
            onClick={() =>
              start(async () =>
                setMsg(
                  await saveDrawDetails(draw.id, {
                    title,
                    description: desc,
                    imageUrl: images[0] ?? "",
                    gallery: images.slice(1),
                    facts: facts.split("\n").map((f) => f.trim()).filter(Boolean),
                    prizeValue: Number(value) || null,
                  }),
                ),
              )
            }
          >
            {pending ? "Saving…" : "Save details"}
          </button>
        </div>
      )}

      {open === "delivery" && (
        <div className="manager-panel space-y-3">
          <p className="text-sm text-pine-900/70">Upload a photo of the winner receiving the prize (with their permission). It appears on the Winners page and builds trust.</p>
          <ImageUploader value={deliv} onChange={setDeliv} folder="delivery" max={1} label="Add handover photo" />
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Delivered to Ali in Hyderabad on 25 Oct" />
          <button type="button" className="btn-primary w-full" disabled={pending} onClick={() => start(async () => setMsg(await setDeliveryProof(draw.id, deliv[0] ?? "", note)))}>
            {pending ? "Saving…" : "Publish delivery"}
          </button>
        </div>
      )}

      {msg && <p className={`text-sm ${msg.ok ? "text-pine-700" : "text-red-700"}`}>{msg.message}</p>}
    </div>
  );
}
