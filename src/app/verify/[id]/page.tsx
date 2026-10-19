import { notFound } from "next/navigation";
import VerifyDraw from "@/components/VerifyDraw";
import { createClient } from "@/lib/supabase/server";
import type { Draw } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("draws").select("*").eq("id", id).single();
  if (!data) notFound();
  const draw = data as Draw;

  if (draw.status !== "drawn" || !draw.proof) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <h1 className="font-display text-3xl font-bold text-pine-800">{draw.title}</h1>
        <p className="card p-4 text-sm">This draw has not been drawn yet. Its published seed fingerprint is:</p>
        <code className="block break-all rounded-lg bg-pine-50 p-3 text-xs">{draw.seed_hash}</code>
      </div>
    );
  }

  const { data: tickets } = await supabase
    .from("draw_tickets_public")
    .select("number, owner_tag")
    .eq("draw_id", id)
    .order("number")
    .range(0, 99999);

  const proof = draw.proof as {
    seed: string;
    fingerprint: string;
    beacon: string;
    final_hash: string;
    winning_ticket: number;
    target: number;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-pine-800">Verify: {draw.title}</h1>
        <p className="text-sm text-pine-900/70">
          Winner: ticket #{draw.winner_ticket} ({draw.winner_label}). You do not have to trust us: this page
          re-computes the result inside your own browser.
        </p>
      </div>

      <VerifyDraw
        seedHash={draw.seed_hash}
        seed={proof.seed}
        beacon={proof.beacon}
        target={proof.target}
        claimedWinner={proof.winning_ticket}
        claimedFingerprint={proof.fingerprint}
        tickets={(tickets ?? []) as { number: number; owner_tag: string }[]}
      />

      <details className="card p-4 text-sm">
        <summary className="cursor-pointer font-semibold text-pine-800">The formula</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-pine-900/80">
          <li>When the draw was created we published <code>sha256(seed)</code>.</li>
          <li>After the last ticket sold, the fingerprint is <code>sha256(&quot;1:tag,2:tag,...&quot;)</code> over the public ticket list.</li>
          <li>Final hash = <code>sha256(seed : fingerprint : beacon)</code>.</li>
          <li>Winning ticket = (first 15 hex digits of the final hash as a number) mod tickets + 1.</li>
        </ol>
        <p className="mt-2 text-pine-900/70">
          Public randomness used: <code className="break-all">{proof.beacon || "none (drand was unreachable)"}</code>
        </p>
        {draw.full_at && draw.drawn_at && (
          <p className="mt-1 text-pine-900/70">
            Last ticket sold: {new Date(draw.full_at).toLocaleString("en-PK")} · Drawn:{" "}
            {new Date(draw.drawn_at).toLocaleString("en-PK")}
          </p>
        )}
      </details>
    </div>
  );
}
