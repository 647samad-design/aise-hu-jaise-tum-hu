"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buyTickets, type ActionResult } from "@/app/actions";
import Icon from "@/components/Icon";
import { Notice } from "@/components/auth/fields";
import { pkr } from "@/lib/format";

type Props = {
  drawId: string;
  price: number;
  left: number;
  maxQty: number; // what this user may still buy (per-person cap and tickets left)
  signedIn: boolean;
  hasPhone: boolean;
  balance: number;
  owned?: number;
};

export default function BuyTickets({ drawId, price, left, maxQty, signedIn, hasPhone, balance, owned = 0 }: Props) {
  const router = useRouter();
  const [qty, setQty] = useState(Math.min(5, Math.max(1, maxQty)));
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const here = `/draws/${drawId}`;

  if (!signedIn) {
    return (
      <div className="space-y-2">
        <Link href={`/signup?next=${encodeURIComponent(here)}`} className="btn-gold w-full">Create free account to play</Link>
        <Link href={`/login?next=${encodeURIComponent(here)}`} className="btn-ghost w-full">I already have an account</Link>
      </div>
    );
  }
  if (!hasPhone) {
    return (
      <Link href={`/profile?welcome=1&next=${encodeURIComponent(here)}`} className="btn-gold w-full">
        Add your phone number to buy tickets
      </Link>
    );
  }
  if (maxQty < 1) {
    return (
      <Notice tone="info">
        {owned > 0 ? `You hold ${owned} tickets — the maximum for this draw. Good luck!` : "No more tickets available for you in this draw."}
      </Notice>
    );
  }

  const cost = qty * price;
  const short = cost > balance;
  const presets = [1, 5, 10, 20, 50].filter((n) => n <= Math.min(maxQty, left));
  const set = (n: number) => {
    setQty(Math.max(1, Math.min(maxQty, n)));
    setConfirming(false);
    setResult(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="qty">
          <button type="button" onClick={() => set(qty - 1)} disabled={qty <= 1} aria-label="One fewer ticket"><Icon name="minus" size={18} /></button>
          <input
            aria-label="Number of tickets"
            type="number"
            inputMode="numeric"
            min={1}
            max={maxQty}
            value={qty}
            onChange={(e) => set(Number(e.target.value) || 1)}
          />
          <button type="button" onClick={() => set(qty + 1)} disabled={qty >= maxQty} aria-label="One more ticket"><Icon name="plus" size={18} /></button>
        </div>
        <p className="text-right text-sm">
          <span className="block text-pine-900/60">Total</span>
          <b className="font-display text-2xl text-pine-900">{pkr(cost)}</b>
        </p>
      </div>

      {presets.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((n) => (
            <button key={n} type="button" onClick={() => set(n)} className="chip" aria-pressed={qty === n}>
              {n}
            </button>
          ))}
          {maxQty > 1 && !presets.includes(maxQty) && (
            <button type="button" onClick={() => set(maxQty)} className="chip" aria-pressed={qty === maxQty}>Max {maxQty}</button>
          )}
        </div>
      )}

      <p className="flex justify-between text-xs text-pine-900/60">
        <span>Wallet: {pkr(balance)}</span>
        {!short && <span>After purchase: {pkr(balance - cost)}</span>}
      </p>

      {short ? (
        <>
          <Link href={`/draws/${drawId}/join?qty=${qty}`} className="btn-gold w-full">
            Pay {pkr(cost)} &amp; join
          </Link>
          <p className="text-center text-xs text-pine-900/60">EasyPaisa · JazzCash · Bank — upload your screenshot, we verify and enter you.</p>
        </>
      ) : confirming ? (
        <div className="confirm-box">
          <p>
            Buy <b>{qty}</b> ticket{qty > 1 ? "s" : ""} for <b>{pkr(cost)}</b>? This can&apos;t be undone.
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setConfirming(false)} disabled={pending}>Cancel</button>
            <button
              type="button"
              disabled={pending}
              className="btn-gold flex-1"
              onClick={() =>
                start(async () => {
                  const r = await buyTickets(drawId, qty);
                  setResult(r);
                  setConfirming(false);
                  router.refresh();
                })
              }
            >
              {pending ? <><span className="spinner dark" aria-hidden="true" /> Buying…</> : "Confirm"}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-gold w-full" onClick={() => { setResult(null); setConfirming(true); }}>
          Buy {qty} ticket{qty > 1 ? "s" : ""} from wallet
        </button>
      )}

      {!short && !confirming && (
        <Link href={`/draws/${drawId}/join?qty=${qty}`} className="block text-center text-sm font-semibold text-pine-700 underline underline-offset-4">
          Or pay {pkr(cost)} directly with EasyPaisa / JazzCash
        </Link>
      )}

      {result && (
        <Notice tone={result.ok ? "success" : "error"}>
          {result.message}{" "}
          {result.ok && <Link href="/tickets" className="underline">View my tickets</Link>}
        </Notice>
      )}
    </div>
  );
}
