import type { Metadata } from "next";
import Link from "next/link";
import DrawCard from "@/components/DrawCard";
import Icon, { type IconName } from "@/components/Icon";
import JsonLd from "@/components/JsonLd";
import { getPublicDraws, getPublicStats } from "@/lib/public-draws";
import { getT } from "@/lib/i18n/server";
import type { Key } from "@/lib/i18n/messages";
import { getPaySettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/" } };

const FAQ: [Key, Key][] = [
  ["faq_q1", "faq_a1"],
  ["faq_q2", "faq_a2"],
  ["faq_q3", "faq_a3"],
  ["faq_q4", "faq_a4"],
  ["faq_q5", "faq_a5"],
];

const STEPS: [IconName, Key, Key][] = [
  ["user", "how_1t", "how_1p"],
  ["ticket", "how_2t", "how_2p"],
  ["wallet", "how_3t", "how_3p"],
  ["check", "how_4t", "how_4p"],
];

export default async function Home() {
  const [{ draws, unavailable }, stats, t, pay] = await Promise.all([getPublicDraws(), getPublicStats(), getT(), getPaySettings()]);
  const wa = pay.supportWhatsapp?.replace(/[^0-9]/g, "");

  return (
    <div className="home">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: t(q), acceptedAnswer: { "@type": "Answer", text: t(a) } })),
        }}
      />

      <section className="premium-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> {t("home_eyebrow")}</p>
          <h1>
            {t("home_h1a")}
            <br />
            {t("home_h1b")}<em>{t("home_h1c")}</em>
          </h1>
          <p className="hero-description">{t("home_lead")}</p>
          <div className="hero-actions">
            <a href="#draws" className="btn-gold hero-btn">{t("home_cta")} <Icon name="arrow" className="flip-rtl" /></a>
            <a href="#how-it-works" className="hero-secondary">{t("home_cta2")}</a>
          </div>
          <div className="hero-note"><Icon name="shield" /><span>{t("home_note")}</span></div>
        </div>
        <div className="hero-art" aria-label={t("home_art_label")}>
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <span className="art-caption">{t("home_art_caption")}</span>
          <div className="entry-ticket" dir="ltr">
            <div className="ticket-top"><span>1RUPYA</span><Icon name="ticket" /></div>
            <div className="ticket-amount"><small>FROM PKR</small><strong>1<span>.00</span></strong></div>
            <div className="ticket-bottom"><span>A little chance.<br />A bigger possibility.</span><span className="ticket-star">✳</span></div>
            <div className="ticket-stub"><span>YOUR POSSIBILITY STARTS HERE</span><div className="barcode" /></div>
          </div>
          <div className="proof-float"><span className="proof-icon"><Icon name="shield" /></span><div><strong>{t("home_proof_t")}</strong><span>{t("home_proof_s")}</span></div></div>
        </div>
      </section>

      <div className="confidence-strip simple">
        <span><Icon name="ticket" /> {t("strip_1")}</span>
        <span><Icon name="wallet" /> {t("strip_2")}</span>
        <span><Icon name="shield" /> {t("strip_3")}</span>
        <span><Icon name="check" /> {t("strip_4")}</span>
      </div>

      <section id="draws" className="draw-section">
        <div className="section-heading">
          <div><p className="eyebrow">{t("draws_eyebrow")}</p><h2>{t("draws_h2")}</h2></div>
          <Link href="/winners" className="text-link">{t("draws_past")} <Icon name="arrow" className="flip-rtl" /></Link>
        </div>
        {draws.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{draws.map((d) => <DrawCard key={d.id} draw={d} />)}</div>
        ) : (
          <div className="draw-empty">
            <div className="empty-icon"><Icon name="ticket" /></div>
            <div>
              <h3>{unavailable ? t("draws_err_h") : t("draws_none_h")}</h3>
              <p>{unavailable ? t("draws_err_p") : t("draws_none_p")}</p>
            </div>
            <Link href="/" className="btn-ghost">{t("draws_refresh")}</Link>
          </div>
        )}
        <p className="draw-disclaimer">{t("draws_disclaimer")}</p>
      </section>

      {stats && stats.entries > 0 && (
        <section className="trust-stats" aria-label={t("stats_label")}>
          <div><strong>{stats.players.toLocaleString()}</strong><span>{t("stats_players")}</span></div>
          <div><strong>{stats.entries.toLocaleString()}</strong><span>{t("stats_entries")}</span></div>
          <div><strong>{stats.completed.toLocaleString()}</strong><span>{t("stats_completed")}</span></div>
          <div><strong>{stats.delivered.toLocaleString()}</strong><span>{t("stats_delivered")}</span></div>
        </section>
      )}

      <section id="how-it-works" className="how-simple">
        <p className="eyebrow">{t("how_eyebrow")}</p>
        <h2>{t("how_h2")}</h2>
        <ol className="how-grid">
          {STEPS.map(([icon, title, body], i) => (
            <li key={title}>
              <span className="how-num">{i + 1}</span>
              <Icon name={icon} size={28} />
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
            </li>
          ))}
        </ol>
        <div className="how-cta">
          <Link href="/signup" className="btn-gold hero-btn">{t("how_cta")}</Link>
          {wa && (
            <a className="btn-whatsapp hero-btn" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">{t("help_whatsapp")}</a>
          )}
        </div>
      </section>

      <section id="fairness" className="fairness-panel">
        <div>
          <p className="eyebrow">{t("fair_eyebrow")}</p>
          <h2>{t("fair_h2a")}<br /><em>{t("fair_h2b")}</em></h2>
          <p>{t("fair_p")}</p>
          <Link href="/winners" className="btn-gold">{t("fair_cta")} <Icon name="arrow" className="flip-rtl" /></Link>
        </div>
        <div className="fairness-details">
          <Icon name="shield" />
          <h3>{t("fair_h3")}</h3>
          {(["fair_1", "fair_2", "fair_3", "fair_4"] as Key[]).map((k) => (
            <p key={k}><Icon name="check" /> {t(k)}</p>
          ))}
        </div>
      </section>

      <section className="faq-section">
        <div><p className="eyebrow">{t("faq_eyebrow")}</p><h2>{t("faq_h2")}</h2></div>
        <div>
          {FAQ.map(([q, a]) => (
            <details key={q}><summary>{t(q)}<span>+</span></summary><p>{t(a)}</p></details>
          ))}
        </div>
      </section>
    </div>
  );
}
