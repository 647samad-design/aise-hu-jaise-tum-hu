import { createClient } from "@/lib/supabase/server";

export type PaySettings = {
  qrUrl: string | null;
  accountName: string | null;
  easypaisa: string | null;
  jazzcash: string | null;
  bank: string | null;
  supportWhatsapp: string | null;
  minTopup: number;
};

/** Payment details set in /admin → Settings, falling back to the env vars. */
export async function getPaySettings(): Promise<PaySettings> {
  const env = {
    qrUrl: process.env.NEXT_PUBLIC_PAY_QR_URL || null,
    accountName: process.env.NEXT_PUBLIC_PAY_ACCOUNT_NAME || null,
    easypaisa: process.env.NEXT_PUBLIC_PAY_EASYPAISA || null,
    jazzcash: process.env.NEXT_PUBLIC_PAY_JAZZCASH || null,
    bank: null as string | null,
    supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || null,
    minTopup: Number(process.env.NEXT_PUBLIC_MIN_TOPUP ?? 50),
  };
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("app_settings").select("key, value");
    const m = new Map((data ?? []).map((r) => [r.key as string, (r.value as string | null) ?? null]));
    const pick = (k: string, fallback: string | null) => (m.has(k) ? m.get(k) ?? null : fallback);
    return {
      qrUrl: pick("pay_qr_url", env.qrUrl),
      accountName: pick("pay_account_name", env.accountName),
      easypaisa: pick("pay_easypaisa", env.easypaisa),
      jazzcash: pick("pay_jazzcash", env.jazzcash),
      bank: pick("pay_bank", env.bank),
      supportWhatsapp: pick("support_whatsapp", env.supportWhatsapp),
      minTopup: Number(pick("min_topup", String(env.minTopup)) || env.minTopup),
    };
  } catch {
    return env;
  }
}
