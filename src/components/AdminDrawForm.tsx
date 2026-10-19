"use client";

import { useActionState, useEffect, useState } from "react";
import { createDraw, type ActionResult } from "@/app/actions";
import ImageUploader from "@/components/admin/ImageUploader";

export default function AdminDrawForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createDraw, null);
  const [images, setImages] = useState<string[]>([]);
  const [price, setPrice] = useState(2);
  const [target, setTarget] = useState(100);

  // Start the next draw with a clean form (photos live in state, not in the <form>).
  useEffect(() => {
    if (state?.ok) {
      setImages([]);
      setPrice(2);
      setTarget(100);
    }
  }, [state]);

  return (
    <form key={state?.ok ? `ok-${Date.now()}` : "form"} action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Product photos</label>
        <ImageUploader value={images} onChange={setImages} folder="draws" hint="Upload clear photos of the actual item. The first one is the cover; use ‹ › to reorder." />
        <input type="hidden" name="image_url" value={images[0] ?? ""} />
        {images.slice(1).map((u) => <input key={u} type="hidden" name="gallery" value={u} />)}
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="title">Product title</label>
        <input id="title" name="title" required className="input" placeholder="Samsung Galaxy A15 (128GB, Black)" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} className="input" placeholder="Brand new, box packed, PTA approved. Free delivery anywhere in Pakistan." />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="facts">Facts / specs (one per line)</label>
        <textarea id="facts" name="facts" rows={4} className="input" placeholder={"Brand: Samsung\nStorage: 128GB\nCondition: Brand new, sealed\nWarranty: 1 year official\nDelivery: Free, all Pakistan"} />
        <p className="mt-1 text-xs text-pine-900/60">Use “Label: value” to show a neat table on the draw page.</p>
      </div>
      <div>
        <label className="label" htmlFor="prize_value">Market value (PKR, optional)</label>
        <input id="prize_value" name="prize_value" type="number" min={0} className="input" placeholder="45000" />
      </div>
      <div>
        <label className="label" htmlFor="ticket_price">Ticket price (PKR)</label>
        <input id="ticket_price" name="ticket_price" type="number" min={1} max={100} value={price} onChange={(e) => setPrice(Number(e.target.value))} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="target">Total tickets</label>
        <input id="target" name="target" type="number" min={2} value={target} onChange={(e) => setTarget(Number(e.target.value))} required className="input" />
        <p className="mt-1 text-xs text-pine-900/60">Collects {(price * target).toLocaleString()} PKR when sold out.</p>
      </div>
      <div>
        <label className="label" htmlFor="max_per_user">Max tickets per person</label>
        <input id="max_per_user" name="max_per_user" type="number" min={0} defaultValue={0} className="input" />
        <p className="mt-1 text-xs text-pine-900/60">0 = automatic (20% of total).</p>
      </div>
      <div>
        <label className="label" htmlFor="opens_at">Tickets open at (optional)</label>
        <input id="opens_at" name="opens_at" type="datetime-local" className="input" />
        <p className="mt-1 text-xs text-pine-900/60">Pakistan time. Empty = open now. Players get a countdown + notification.</p>
      </div>
      <div>
        <label className="label" htmlFor="ends_at">Deadline (optional)</label>
        <input id="ends_at" name="ends_at" type="datetime-local" className="input" />
        <p className="mt-1 text-xs text-pine-900/60">Pakistan time. If not sold out by then, cancel &amp; refund.</p>
      </div>
      <div className="sm:col-span-2">
        <button disabled={pending} className="btn-primary w-full">{pending ? "Creating..." : "Create draw"}</button>
        {state && (
          <p className={`mt-2 rounded-xl p-3 text-sm ${state.ok ? "bg-pine-50 text-pine-800" : "bg-red-50 text-red-700"}`}>{state.message}</p>
        )}
      </div>
    </form>
  );
}
