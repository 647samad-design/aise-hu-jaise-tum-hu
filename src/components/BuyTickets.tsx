"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buyTickets, type ActionResult } from "@/app/actions";
import Icon from "@/components/Icon";
import { useT } from "@/components/I18nProvider";
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

/**
 * Simple path first: choose how many tickets → "Pay & join" (EasyPaisa/JazzCash + screenshot).
 * Players who already have wallet balance get a second, smaller option to pay from it.
 */
export default function BuyTickets({ drawId, price, left, maxQty, signedIn, hasPhone, balance, owned = 0 }: Props) {
  const router = useRouter();
  const t = useT();
  const [qty, setQty] = useState(1);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const here = `/draws/${drawId}`;

  if (!signedIn) {
    return (
      <div className="space-y-2">
        <Link href={`/signup?next=${encodeURIComponent(here)}`} className="btn-gold big-btn w-full">{t("buy_signup")}</Link>
        <Link href={`/login?next=${encodeURIComponent(here)}`} className="btn-ghost w-full">{t("buy_login")}</Link>
      </div>
    );
  }
  if (!hasPhone) {
    return (
      <Link href={`/profile?welcome=1&next=${encodeURIComponent(here)}`} className="btn-gold big-btn w-full">
        {t("buy_add_phone")}
      </Link>
    );
  }
  if (maxQty < 1) {
    return <Notice tone="info">{owned > 0 ? t("buy_limit", { n: owned }) : t("buy_none")}</Notice>;
  }

  const cost = qty * price;
  const canWallet = balance >= cost;
  const presets = [1, 2, 5, 10, 20].filter((n) => n <= Math.min(maxQty, left));
  const set = (n: number) => {
    setQty(Math.max(1, Math.min(maxQty, n)));
    setConfirming(false);
    setResult(null);
  };

  return (
    <div className="space-y-4">
      <p className="buy-label">{t("buy_how_many")}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="qty" dir="ltr">
          <button type="button" onClick={() => set(qty - 1)} disabled={qty <= 1} aria-label={t("buy_fewer")}><Icon name="minus" size={20} /></button>
          <input aria-label={t("buy_count")} type="number" inputMode="numeric" min={1} max={maxQty} value={qty} onChange={(e) => set(Number(e.target.value) || 1)} />
          <button type="button" onClick={() => set(qty + 1)} disabled={qty >= maxQty} aria-label={t("buy_more")}><Icon name="plus" size={20} /></button>
        </div>
        <p className="text-end text-sm">
          <span className="block text-pine-900/60">{t("buy_total")}</span>
          <b className="font-display text-3xl text-pine-900">{pkr(cost)}</b>
        </p>
      </div>

      {presets.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((n) => (
            <button key={n} type="button" onClick={() => set(n)} className="chip" aria-pressed={qty === n}>{n}</button>
          ))}
          {maxQty > 1 && !presets.includes(maxQty) && maxQty <= 200 && (
            <button type="button" onClick={() => set(maxQty)} className="chip" aria-pressed={qty === maxQty}>{t("buy_max", { n: maxQty })}</button>
          )}
        </div>
      )}

      {confirming ? (
        <div className="confirm-box">
          <p>{t("buy_confirm", { n: qty, amount: pkr(cost) })}</p>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setConfirming(false)} disabled={pending}>{t("buy_cancel")}</button>
            <button
              type="button"
              disabled={pending}
              className="btn-gold flex-1"
              onClick={() =>
                start(async () => {
                  setResult(await buyTickets(drawId, qty));
                  setConfirming(false);
                  router.refresh();
                })
              }
            >
              {pending ? <><span className="spinner dark" aria-hidden="true" /> {t("buy_buying")}</> : t("buy_yes")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <Link href={`/draws/${drawId}/join?qty=${qty}`} className="btn-gold big-btn w-full">
            {t("buy_pay", { amount: pkr(cost) })}
          </Link>
          <p className="text-center text-xs leading-relaxed text-pine-900/60">{t("buy_pay_hint")}</p>
          {canWallet && (
            <button type="button" className="btn-ghost w-full" onClick={() => { setResult(null); setConfirming(true); }}>
              <Icon name="wallet" size={18} /> {t("buy_wallet", { balance: pkr(balance) })}
            </button>
          )}
        </>
      )}

      {result && (
        <Notice tone={result.ok ? "success" : "error"}>
          {result.ok && result.data ? t("buy_done", { first: result.data.first, last: result.data.last }) : result.message} {result.ok && <Link href="/tickets" className="underline">{t("buy_view")}</Link>}
        </Notice>
      )}
    </div>
  );
}
