"use client";

import { useState } from "react";

type Ticket = { number: number; owner_tag: string };
type Props = {
  seedHash: string;
  seed: string;
  beacon: string;
  target: number;
  claimedWinner: number;
  claimedFingerprint: string;
  tickets: Ticket[];
};

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Re-computes the whole draw in YOUR browser. Nothing here trusts the server's answer.
export default function VerifyDraw(p: Props) {
  const [rows, setRows] = useState<{ label: string; ok: boolean; detail: string }[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const out: { label: string; ok: boolean; detail: string }[] = [];

    const seedCheck = await sha256Hex(p.seed);
    out.push({
      label: "Secret seed matches the hash published before the first ticket was sold",
      ok: seedCheck === p.seedHash,
      detail: seedCheck,
    });

    const sorted = [...p.tickets].sort((a, b) => a.number - b.number);
    const complete = sorted.length === p.target && sorted.every((t, i) => t.number === i + 1);
    out.push({
      label: `Ticket list is complete (1 to ${p.target}, no gaps)`,
      ok: complete,
      detail: `${sorted.length} tickets`,
    });

    const fp = await sha256Hex(sorted.map((t) => `${t.number}:${t.owner_tag}`).join(","));
    out.push({ label: "Ticket-list fingerprint matches", ok: fp === p.claimedFingerprint, detail: fp });

    const finalHash = await sha256Hex(`${p.seed}:${fp}:${p.beacon}`);
    const n = BigInt("0x" + finalHash.slice(0, 15)) % BigInt(p.target);
    const winner = Number(n) + 1;
    out.push({
      label: `Winning ticket re-computed: #${winner}`,
      ok: winner === p.claimedWinner,
      detail: `final hash ${finalHash}`,
    });

    setRows(out);
    setBusy(false);
  }

  const allOk = rows?.every((r) => r.ok);

  return (
    <div className="space-y-4">
      <button onClick={run} disabled={busy} className="btn-primary">
        {busy ? "Checking..." : "Run verification in my browser"}
      </button>

      {rows && (
        <>
          <p className={`rounded-xl p-3 text-sm font-semibold ${allOk ? "bg-pine-50 text-pine-800" : "bg-red-50 text-red-700"}`}>
            {allOk ? "All checks passed: this result is genuine." : "A check failed. Please report this draw."}
          </p>
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.label} className="card p-3 text-sm">
                <p className="font-semibold">{r.ok ? "✅" : "❌"} {r.label}</p>
                <p className="mt-1 break-all font-mono text-xs text-pine-900/60">{r.detail}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
