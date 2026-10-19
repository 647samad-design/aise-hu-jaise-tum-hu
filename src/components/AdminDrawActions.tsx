"use client";

import { useState, useTransition } from "react";
import { cancelDraw, runDraw, type ActionResult } from "@/app/actions";

export default function AdminDrawActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<ActionResult | null>(null);

  const canDraw = status === "full";
  const canCancel = status === "open" || status === "full";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canDraw && (
          <button
            disabled={pending}
            className="btn-gold !py-2"
            onClick={() => {
              if (!window.confirm("Run the draw now? This cannot be undone.")) return;
              start(async () => setRes(await runDraw(id)));
            }}
          >
            🎲 Draw winner
          </button>
        )}
        {canCancel && (
          <button
            disabled={pending}
            className="btn-ghost !py-2"
            onClick={() => {
              if (!window.confirm("Cancel this draw and refund every ticket to wallets?")) return;
              start(async () => setRes(await cancelDraw(id)));
            }}
          >
            Cancel & refund
          </button>
        )}
      </div>
      {res && <p className={`text-sm ${res.ok ? "text-pine-700" : "text-red-700"}`}>{res.message}</p>}
    </div>
  );
}
