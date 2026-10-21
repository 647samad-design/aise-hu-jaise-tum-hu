"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { submitPayment, type ActionResult } from "@/app/actions";
import { CopyButton } from "@/components/ClientBits";
import Icon from "@/components/Icon";
import { Notice } from "@/components/auth/fields";
import { useT } from "@/components/I18nProvider";
import type { PaySettings } from "@/lib/settings";
import { compressImage, sha256, uploadTo } from "@/lib/upload";
import { pkr } from "@/lib/format";

type Props = {
  userId: string;
  settings: PaySettings;
  /** Paying to join one draw (amount is fixed) — otherwise a free-amount wallet top-up. */
  draw?: { id: string; title: string; qty: number; price: number };
};

const QUICK = [100, 200, 500, 1000];

export default function PaymentForm({ userId, settings, draw }: Props) {
  const router = useRouter();
  const t = useT();
  const [amount, setAmount] = useState(draw ? draw.qty * draw.price : Math.max(settings.minTopup, 100));
  const [method, setMethod] = useState(settings.easypaisa ? "easypaisa" : settings.jazzcash ? "jazzcash" : "bank");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sender, setSender] = useState("");
  const [trx, setTrx] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const input = useRef<HTMLInputElement>(null);

  const fixed = !!draw;
  const hasAccounts = settings.easypaisa || settings.jazzcash || settings.bank;

  function pick(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErrors((e) => ({ ...e, file: t("pay_err_type") }));
    setFile(f);
    setErrors((e) => ({ ...e, file: "" }));
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!file) errs.file = t("pay_err_file");
    if (sender.trim().length < 3) errs.sender = t("pay_err_sender");
    if (!/^[0-9A-Za-z]{6,24}$/.test(trx.trim())) errs.trx = t("pay_err_trx");
    if (!fixed && amount < settings.minTopup) errs.amount = t("pay_err_min", { amount: pkr(settings.minTopup) });
    setErrors(errs);
    if (Object.values(errs).some(Boolean) || !file) return;

    setResult(null);
    try {
      setBusy(t("pay_uploading"));
      const hash = await sha256(file);
      const small = await compressImage(file);
      const path = await uploadTo("payment-proofs", userId, small);
      setBusy(t("pay_sending"));
      const r = await submitPayment({
        amount,
        trxId: trx.trim(),
        method,
        senderName: sender.trim(),
        screenshotPath: path,
        screenshotSha: hash,
        drawId: draw?.id ?? null,
        qty: draw?.qty ?? null,
      });
      setResult(r);
      if (r.ok) router.refresh();
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : t("pay_err_upload") });
    } finally {
      setBusy(null);
    }
  }

  if (result?.ok) {
    return (
      <div className="panel pay-done">
        <div className="mail-badge" aria-hidden="true"><Icon name="check" size={28} /></div>
        <h2 className="panel-title">{t("pay_done_h")}</h2>
        <p>{draw ? t("pay_done_join") : t("pay_done_wallet")}</p>
        <ol className="pay-timeline">
          <li className="done"><span>1</span> {t("pay_step1")}</li>
          <li className="now"><span>2</span> {t("pay_step2")}</li>
          <li><span>3</span> {draw ? t("pay_step3_join") : t("pay_step3_wallet")}</li>
        </ol>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={draw ? `/draws/${draw.id}` : "/wallet"} className="btn-primary">{draw ? t("pay_back_draw") : t("pay_view_wallet")}</Link>
          <Link href="/notifications" className="btn-ghost">{t("nav_notifications")}</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="panel space-y-6" id="add-money" noValidate>
      <div>
        <h2 className="panel-title">{draw ? t("pay_title_join") : t("pay_title_wallet")}</h2>
        {draw && (
          <p className="pay-summary">
            <b>{draw.title}</b>
            <br />
            {t("tickets_n", { n: draw.qty })} × {pkr(draw.price)} = <b>{pkr(draw.qty * draw.price)}</b>
          </p>
        )}
      </div>

      {/* Step 1: pay */}
      <section className="pay-step">
        <h3><span>1</span> {fixed ? t("pay_s1", { amount: pkr(amount) }) : t("pay_s1_any")}</h3>
        {settings.qrUrl && (
          <div className="qr-box">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.qrUrl} alt={t("pay_qr_alt")} width={220} height={220} />
            <div className="qr-text">
              <p className="qr-title">{t("pay_scan")}</p>
              <p>{t("pay_scan_p")}</p>
              <a href={settings.qrUrl} download="1rupya-payment-qr" target="_blank" rel="noopener" className="btn-ghost !py-2">{t("pay_save_qr")}</a>
            </div>
          </div>
        )}
        {hasAccounts ? (
          <div className="pay-box">
            {settings.accountName && <p className="pay-name">{t("pay_acc_name")} <b>{settings.accountName}</b></p>}
            {settings.easypaisa && (
              <div className="pay-line"><span className="pay-brand ep">EasyPaisa</span><b className="tabular-nums" dir="ltr">{settings.easypaisa}</b><CopyButton value={settings.easypaisa} /></div>
            )}
            {settings.jazzcash && (
              <div className="pay-line"><span className="pay-brand jc">JazzCash</span><b className="tabular-nums" dir="ltr">{settings.jazzcash}</b><CopyButton value={settings.jazzcash} /></div>
            )}
            {settings.bank && (
              <div className="pay-line"><span className="pay-brand bk">{t("pay_bank")}</span><b className="whitespace-pre-line text-sm">{settings.bank}</b><CopyButton value={settings.bank} /></div>
            )}
          </div>
        ) : (
          !settings.qrUrl && <Notice tone="info">{t("pay_setup")}</Notice>
        )}
        {fixed && <div><CopyButton value={String(amount)} label={t("pay_copy_amount", { n: amount })} /></div>}
      </section>

      {/* Step 2: proof */}
      <section className="pay-step">
        <h3><span>2</span> {t("pay_s2")}</h3>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
        <button
          type="button"
          className={`drop ${preview ? "has" : ""} ${errors.file ? "err" : ""}`}
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt={t("pay_shot_alt")} />
              <span className="drop-change">{t("pay_change")}</span>
            </>
          ) : (
            <span className="drop-empty">
              <Icon name="plus" size={26} />
              <b>{t("pay_tap_upload")}</b>
              <small>{t("pay_upload_hint")}</small>
            </span>
          )}
        </button>
        {errors.file && <p className="field-error">{errors.file}</p>}
      </section>

      {/* Step 3: details */}
      <section className="pay-step">
        <h3><span>3</span> {t("pay_s3")}</h3>
        {!fixed && (
          <div className="field">
            <label htmlFor="amount">{t("pay_amount")}</label>
            <div className={`field-box ${errors.amount ? "has-error" : ""}`}>
              <input id="amount" type="number" inputMode="numeric" min={settings.minTopup} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK.filter((q) => q >= settings.minTopup).map((q) => (
                <button key={q} type="button" onClick={() => setAmount(q)} className="chip" aria-pressed={amount === q}>{q}</button>
              ))}
            </div>
            {errors.amount && <p className="field-error">{errors.amount}</p>}
          </div>
        )}
        <div className="field">
          <label htmlFor="method">{t("pay_with")}</label>
          <div className="seg seg-3" role="radiogroup">
            {[["easypaisa", "EasyPaisa"], ["jazzcash", "JazzCash"], ["bank", t("pay_bank_raast")]].map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={method === v} onClick={() => setMethod(v)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="sender">{t("pay_sender")}</label>
          <div className={`field-box ${errors.sender ? "has-error" : ""}`}>
            <Icon name="user" size={18} className="field-icon" />
            <input id="sender" value={sender} onChange={(e) => setSender(e.target.value)} placeholder={t("pay_sender_ph")} autoComplete="name" />
          </div>
          {errors.sender ? <p className="field-error">{errors.sender}</p> : <p className="field-hint">{t("pay_sender_hint")}</p>}
        </div>
        <div className="field">
          <label htmlFor="trx">{t("pay_trx")}</label>
          <div className={`field-box ${errors.trx ? "has-error" : ""}`}>
            <input id="trx" value={trx} onChange={(e) => setTrx(e.target.value.replace(/\s/g, ""))} placeholder={t("pay_trx_ph")} dir="ltr" autoComplete="off" autoCapitalize="characters" inputMode="text" />
          </div>
          {errors.trx ? <p className="field-error">{errors.trx}</p> : <p className="field-hint">{t("pay_trx_hint")}</p>}
        </div>
      </section>

      {result && !result.ok && <Notice tone="error">{result.message}</Notice>}
      <button type="submit" className="btn-gold w-full auth-submit" disabled={!!busy}>
        {busy ? <><span className="spinner dark" aria-hidden="true" /> {busy}</> : draw ? t("pay_submit_join", { amount: pkr(amount) }) : t("pay_submit", { amount: pkr(amount) })}
      </button>
      <p className="text-center text-xs text-pine-900/60">{t("pay_footer")}</p>
    </form>
  );
}
