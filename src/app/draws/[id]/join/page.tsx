import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Icon from "@/components/Icon";
import PaymentForm from "@/components/PaymentForm";
import { Notice } from "@/components/auth/fields";
import { getSessionProfile } from "@/lib/auth";
import { isUpcoming, pkr, type Draw } from "@/lib/format";
import { getPaySettings } from "@/lib/settings";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Pay & join · 1Rupya", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function JoinPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ qty?: string }> }) {
  const { id } = await params;
  const { qty: qtyRaw } = await searchParams;
  const { supabase, user, profile } = await getSessionProfile();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/draws/${id}/join?qty=${qtyRaw ?? 1}`)}`);
  if (!profile?.phone) redirect(`/profile?welcome=1&next=${encodeURIComponent(`/draws/${id}/join?qty=${qtyRaw ?? 1}`)}`);

  const { data } = await supabase.from("draws").select("*").eq("id", id).single();
  if (!data) notFound();
  const draw = data as Draw;
  const { count: have } = await supabase.from("tickets").select("id", { count: "exact", head: true }).eq("draw_id", id).eq("user_id", user.id);
  const left = draw.target_tickets - draw.sold_tickets;
  const maxQty = Math.max(0, Math.min(left, draw.max_per_user - (have ?? 0)));
  const qty = Math.max(1, Math.min(maxQty, Math.floor(Number(qtyRaw) || 1)));
  const settings = await getPaySettings();
  const open = draw.status === "open" && !isUpcoming(draw);
  const t = await getT();

  return (
    <div className="page narrow">
      <Link href={`/draws/${id}`} className="back-link"><Icon name="arrow-left" size={16} className="flip-rtl" /> {t("join_back", { title: draw.title })}</Link>
      <header className="page-head">
        <p className="eyebrow">{t("join_eyebrow")}</p>
        <h1>{t("join_h1")}</h1>
        <p>{t("join_p")}</p>
      </header>
      {!open ? (
        <Notice tone="info">{t("join_closed")}</Notice>
      ) : maxQty < 1 ? (
        <Notice tone="info">{t("join_max")}</Notice>
      ) : (
        <>
          <div className="qty-pick">
            <span>{t("join_tickets")}</span>
            {[1, 2, 5, 10, 20].filter((n) => n <= maxQty).map((n) => (
              <Link key={n} href={`/draws/${id}/join?qty=${n}`} className="chip" aria-pressed={n === qty} replace scroll={false}>{n}</Link>
            ))}
            <b className="ml-auto">{pkr(qty * draw.ticket_price)}</b>
          </div>
          <PaymentForm key={qty} userId={user.id} settings={settings} draw={{ id: draw.id, title: draw.title, qty, price: draw.ticket_price }} />
        </>
      )}
    </div>
  );
}
