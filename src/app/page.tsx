import Link from "next/link";
import DrawExplorer from "@/components/DrawExplorer";
import { createClient } from "@/lib/supabase/server";
import type { Draw } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("draws").select("*").in("status", ["open", "full"]).order("created_at", { ascending: false });
  return <>
    <section className="hero-grid">
      <div className="hero-copy">
        <p className="eyebrow"><span className="live-dot" /> SMALL TICKETS. BIG POSSIBILITIES.</p>
        <h1>A little rupya.<br />A <em>big</em> what if.</h1>
        <p className="hero-description">The gadgets on your wishlist, a little closer. Enter a draw from PKR 1 and follow every step, from your first ticket to the final result.</p>
        <div className="mt-8 flex flex-wrap gap-3"><a href="#draws" className="btn-primary">Explore live draws <span aria-hidden="true">↗</span></a><a href="#how-it-works" className="btn-ghost">How it works</a></div>
        <p className="mt-7 text-xs text-pine-900/60">18+ only <span className="mx-2">·</span> EasyPaisa & JazzCash top-ups <span className="mx-2">·</span> Public draw verification</p>
      </div>
      <div className="hero-art" aria-label="An illustrated ticket showing entries from one Pakistani rupee" role="img">
        <span className="art-caption">A SMALL START. A BIG POSSIBILITY.</span><div className="orbit orbit-one" /><div className="orbit orbit-two" />
        <div className="ticket-art"><div className="ticket-top"><span>1RUPYA</span><span>ENTRY TICKET</span></div><div className="ticket-value"><span>PKR</span>1<span>FROM JUST</span></div><div className="ticket-bottom"><span>YOUR NEXT<br />WHAT IF.</span><span className="barcode" /></div></div>
        <span className="art-star star-one">✳</span><span className="art-star star-two">✳</span><div className="art-note"><span className="live-dot" /> Small entry. Real possibility.</div><span className="art-edition">THE EVERYDAY POSSIBILITY CLUB / PK</span>
      </div>
    </section>
    <div className="trust-strip"><span><b>01</b> Your tickets, your numbers</span><span><b>02</b> Drawn only when sold out</span><span><b>03</b> Results you can verify</span></div>
    <DrawExplorer draws={(data ?? []) as Draw[]} unavailable={!!error} />
    <section id="how-it-works" className="how-section scroll-mt-28">
      <div><p className="eyebrow">NO COMPLICATED STEPS</p><h2 className="section-title">A small start.<br />Then, see what happens.</h2><Link href="/login" className="btn-primary mt-6">Get started ↗</Link></div>
      <ol className="steps-list">{[["Make yourself at home", "Sign in and add your name and phone number so we can contact you if you win."], ["Top up. Pick your possibility.", "Add money with EasyPaisa or JazzCash. Once your payment is approved, choose a draw and buy your tickets."], ["Follow the result", "When all tickets sell, the admin runs the draw. Check the published proof and verify the result yourself."]].map(([title, text], i) => <li key={title}><span className="step-number">0{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
    </section>
    <section className="fairness-banner"><div><p className="eyebrow">LESS GUESSWORK. MORE TRANSPARENCY.</p><h2 className="section-title">Don’t just take our word for it.</h2><p>Each completed draw reveals its proof. Recalculate the result yourself using the ticket list, revealed seed and public randomness.</p></div><Link href="/winners" className="btn-ghost shrink-0">Explore past results ↗</Link></section>
    <section id="help" className="faq-section scroll-mt-28"><div><p className="eyebrow">THE GOOD QUESTIONS</p><h2 className="section-title">Before you jump in.</h2><p className="mt-4 text-sm text-pine-900/65">Know how your entry works.</p></div><div>{[["How do I add money?", "Open your wallet, pay using the EasyPaisa or JazzCash details shown there, and submit the transaction ID. Your balance is credited after an admin verifies the payment."], ["When is a winner chosen?", "A draw must sell every ticket before the admin can choose a winner. The result uses a committed secret seed, the final ticket list and public randomness."], ["What happens if a draw doesn’t fill up?", "If a draw is cancelled by the admin, the ticket amounts are returned to your wallet. A deadline passing does not itself trigger an automatic refund."], ["Does buying a ticket guarantee a prize?", "No. A ticket is an entry into a draw, not a guaranteed prize. Participate only if you are 18 or older and spend only what you can afford."]].map(([q, a]) => <details key={q} className="faq-item"><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
  </>;
}
