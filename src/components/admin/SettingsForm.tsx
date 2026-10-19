"use client";

import { useState, useTransition } from "react";
import { saveSettings, type ActionResult } from "@/app/actions";
import ImageUploader from "@/components/admin/ImageUploader";
import type { PaySettings } from "@/lib/settings";

/** Payment details players see on Wallet and Pay & join. */
export default function SettingsForm({ initial }: { initial: PaySettings }) {
  const [qr, setQr] = useState<string[]>(initial.qrUrl ? [initial.qrUrl] : []);
  const [v, setV] = useState({
    pay_account_name: initial.accountName ?? "",
    pay_easypaisa: initial.easypaisa ?? "",
    pay_jazzcash: initial.jazzcash ?? "",
    pay_bank: initial.bank ?? "",
    support_whatsapp: initial.supportWhatsapp ?? "",
    min_topup: String(initial.minTopup),
  });
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Payment QR code (scanner)</label>
        <ImageUploader value={qr} onChange={setQr} folder="settings" max={1} label="Upload QR" hint="Your EasyPaisa / JazzCash / Raast QR. It shows on Wallet and Pay & join as soon as you save." />
      </div>
      <div>
        <label className="label" htmlFor="s_name">Account holder name</label>
        <input id="s_name" className="input" value={v.pay_account_name} onChange={set("pay_account_name")} placeholder="Muhammad Samad" />
      </div>
      <div>
        <label className="label" htmlFor="s_min">Minimum wallet top-up (PKR)</label>
        <input id="s_min" className="input" inputMode="numeric" value={v.min_topup} onChange={set("min_topup")} />
      </div>
      <div>
        <label className="label" htmlFor="s_ep">EasyPaisa number</label>
        <input id="s_ep" className="input" value={v.pay_easypaisa} onChange={set("pay_easypaisa")} placeholder="03XXXXXXXXX" />
      </div>
      <div>
        <label className="label" htmlFor="s_jc">JazzCash number</label>
        <input id="s_jc" className="input" value={v.pay_jazzcash} onChange={set("pay_jazzcash")} placeholder="03XXXXXXXXX" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="s_bank">Bank account (optional)</label>
        <textarea id="s_bank" className="input" rows={2} value={v.pay_bank} onChange={set("pay_bank")} placeholder={"Meezan Bank · IBAN PK00MEZN0000000000000000"} />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="s_wa">Support WhatsApp (optional, e.g. 923001234567)</label>
        <input id="s_wa" className="input" value={v.support_whatsapp} onChange={set("support_whatsapp")} />
      </div>
      <div className="sm:col-span-2">
        <button className="btn-primary w-full" disabled={pending} onClick={() => start(async () => setMsg(await saveSettings({ ...v, pay_qr_url: qr[0] ?? "" })))}>
          {pending ? "Saving…" : "Save payment settings"}
        </button>
        {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-pine-700" : "text-red-700"}`}>{msg.message}</p>}
      </div>
    </div>
  );
}
