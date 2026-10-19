"use client";

import { useActionState, useState } from "react";
import { submitTopup, type ActionResult } from "@/app/actions";
import { CopyButton } from "@/components/ClientBits";
import { Notice } from "@/components/auth/fields";

const MIN = Number(process.env.NEXT_PUBLIC_MIN_TOPUP ?? 50);
const QUICK = [50, 100, 200, 500];

export default function TopupForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(submitTopup, null);
  const [amount, setAmount] = useState(100);

  const name = process.env.NEXT_PUBLIC_PAY_ACCOUNT_NAME;
  const ep = process.env.NEXT_PUBLIC_PAY_EASYPAISA;
  const jc = process.env.NEXT_PUBLIC_PAY_JAZZCASH;

  return (
    <div className="panel space-y-5" id="add-money">
      <div>
        <h2 className="panel-title">Add money</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-pine-900/80">
          <li>Send the amount to the account below.</li>
          <li>Copy the transaction ID (TRX ID) from the confirmation SMS.</li>
          <li>Submit it here. We credit your wallet after checking the payment.</li>
        </ol>
      </div>

      <div className="pay-box">
        <p className="pay-name">Account name: <b>{name || "(not set yet)"}</b></p>
        {ep && (
          <div className="pay-line">
            <span className="pay-brand ep">EasyPaisa</span>
            <b className="tabular-nums">{ep}</b>
            <CopyButton value={ep} />
          </div>
        )}
        {jc && (
          <div className="pay-line">
            <span className="pay-brand jc">JazzCash</span>
            <b className="tabular-nums">{jc}</b>
            <CopyButton value={jc} />
          </div>
        )}
      </div>

      <form action={action} className="space-y-4">
        <div>
          <label className="label" htmlFor="amount">Amount (PKR)</label>
          <input
            id="amount"
            name="amount"
            type="number"
            min={MIN}
            step={1}
            required
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="input"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(q)}
                className="chip"
                aria-pressed={amount === q}
              >
                {q}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-pine-900/60">Minimum PKR {MIN}.</p>
        </div>

        <div>
          <label className="label" htmlFor="method">Paid with</label>
          <select id="method" name="method" className="input">
            <option value="easypaisa">EasyPaisa</option>
            <option value="jazzcash">JazzCash</option>
            <option value="bank">Bank transfer</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="trx_id">Transaction ID</label>
          <input id="trx_id" name="trx_id" autoComplete="off" autoCapitalize="characters" required minLength={8} maxLength={20} className="input" placeholder="e.g. 12345678901" />
        </div>

        <div>
          <label className="label" htmlFor="sender_name">Sender name (optional)</label>
          <input id="sender_name" name="sender_name" className="input" placeholder="Name on your wallet account" />
        </div>

        <button disabled={pending} className="btn-gold w-full">{pending ? "Submitting..." : "Submit payment"}</button>
        {state && <Notice tone={state.ok ? "success" : "error"}>{state.message}</Notice>}
      </form>
    </div>
  );
}
