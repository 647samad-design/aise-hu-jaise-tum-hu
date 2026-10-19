"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buyTickets, type ActionResult } from "@/app/actions";
import { pkr } from "@/lib/format";

type Props = {
  drawId: string;
  price: number;
  left: number;
  maxQty: number; // what this user may still buy (per-person cap and tickets left)
  signedIn: boolean;
  hasPhone: boolean;
  balance: number;
};

export default function BuyTickets({ drawId, price, left, maxQty, signedIn, hasPhone, balance }: Props) {
  const router = useRouter();
  const [qty, setQty] = useState(Math.min(5, Math.max(1, maxQty)));
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  if (!signedIn) {
    return (
      <Link href="/login" className="btn-gold w-full">Sign in to buy tickets</Link>
    );
  }
  if (!hasPhone) {
    return (
      <Link href="/profile" className="btn-gold w-full">Complete your profile to buy tickets</Link>
    );
  }
  if (maxQty < 1) {
    return <p className="rounded-xl bg-pine-50 p-3 text-center text-sm text-pine-800">You have reached the ticket limit for this draw.</p>;
  }

  const cost = qty * price;
  const short = cost > balance;
  const presets = [1, 5, 10, 20].filter((n) => n <= Math.min(maxQty, left));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-ghost !px-4" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer">−</button>
          <input
            aria-label="Number of tickets"
            type="number"
            min={1}
            max={maxQty}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))}
            className="input !w-20 text-center"
          />
          <button className="btn-ghost !px-4" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label="More">+</button>
        </div>
        <p className="text-right text-sm">
          <span className="block text-pine-900/60">Total</span>
          <b className="text-lg">{pkr(cost)}</b>
        </p>
      </div>

      <div className="flex gap-2">
        {presets.map((n) => (
          <button key={n} onClick={() => setQty(n)} className={`rounded-full px-3 py-1 text-sm ring-1 ${qty === n ? "bg-pine-700 text-white ring-pine-700" : "bg-white ring-pine-200"}`}>
            {n}
          </button>
        ))}
      </div>

      {short ? (
        <Link href="/wallet" className="btn-gold w-full">Add money (you need {pkr(cost - balance)} more)</Link>
      ) : (
        <button
          disabled={pending}
          className="btn-gold w-full"
          onClick={() =>
            start(async () => {
              setResult(await buyTickets(drawId, qty));
              router.refresh();
            })
          }
        >
          {pending ? "Buying..." : `Buy ${qty} ticket${qty > 1 ? "s" : ""}`}
        </button>
      )}

      {result && (
        <p className={`rounded-xl p-3 text-sm ${result.ok ? "bg-pine-50 text-pine-800" : "bg-red-50 text-red-700"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
