import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const alt = "Lucky draw on 1Rupya";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The image WhatsApp / Facebook show when someone shares a draw link.
export default async function DrawOg({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let d: { title: string; image_url: string | null; ticket_price: number; target_tickets: number; sold_tickets: number; status: string } | null = null;
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data } = await db.from("draws").select("title, image_url, ticket_price, target_tickets, sold_tickets, status").eq("id", id).single();
    d = data;
  } catch {
    d = null;
  }
  const title = d?.title ?? "Lucky draw";
  const pct = d ? Math.min(100, Math.round((d.sold_tickets / d.target_tickets) * 100)) : 0;
  const badge = d?.status === "drawn" ? "WINNER ANNOUNCED" : d?.status === "full" ? "SOLD OUT · DRAWING SOON" : "LIVE NOW";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#103f34", color: "#faf8ed" }}>
        <div style={{ width: 560, height: 630, display: "flex", alignItems: "center", justifyContent: "center", background: "#e2e9df" }}>
          {d?.image_url ? (
            <img src={d.image_url} alt="" width={560} height={630} style={{ objectFit: "cover", width: 560, height: 630 }} />
          ) : (
            <div style={{ fontSize: 300, color: "#3d7a5f55" }}>1</div>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 30, fontWeight: 700 }}>
            <div style={{ width: 38, height: 44, borderRadius: "12px 3px 12px 3px", background: "#e8cf94", color: "#103f34", display: "flex", alignItems: "center", justifyContent: "center" }}>1</div>
            Rupya
          </div>
          <div style={{ marginTop: 48, fontSize: 18, letterSpacing: 4, color: "#e8cf94" }}>{badge}</div>
          <div style={{ marginTop: 14, fontSize: title.length > 28 ? 50 : 62, lineHeight: 1.08, letterSpacing: -2 }}>{title}</div>
          <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 14 }}>
            <div style={{ fontSize: 26, color: "#c5d2c7" }}>Ticket</div>
            <div style={{ fontSize: 72, color: "#e8cf94", letterSpacing: -2 }}>{`PKR ${d?.ticket_price ?? 1}`}</div>
          </div>
          <div style={{ marginTop: 22, width: "100%", height: 14, borderRadius: 14, background: "rgba(255,255,255,.15)", display: "flex" }}>
            <div style={{ width: `${pct}%`, height: 14, borderRadius: 14, background: "#e8cf94" }} />
          </div>
          <div style={{ marginTop: 12, fontSize: 22, color: "#c5d2c7" }}>{d ? `${d.sold_tickets} / ${d.target_tickets} tickets sold` : "Tickets from PKR 1"}</div>
        </div>
      </div>
    ),
    size,
  );
}
