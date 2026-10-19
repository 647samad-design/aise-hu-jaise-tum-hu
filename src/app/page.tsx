import Link from "next/link";
import DrawCard from "@/components/DrawCard";
import Icon from "@/components/Icon";
import { getPublicDraws } from "@/lib/public-draws";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { draws, unavailable } = await getPublicDraws();
  return (
    <div className="home">
      <section className="premium-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> SMALL TICKETS. BIG POSSIBILITIES.</p>
          <h1>A little rupya.<br />A world of <em>possibility.</em></h1>
          <p className="hero-description">Your next favourite gadget could start with just PKR 1. Explore the draws, know the rules, and verify the result for yourself.</p>
          <div className="hero-actions"><a href="#draws" className="btn-gold">Explore draws <Icon name="arrow" /></a><a href="#how-it-works" className="hero-secondary">How it works <span>↗</span></a></div>
          <div className="hero-note"><Icon name="shield" /><span>Public draw proof. Transparent ticket progress.</span></div>
        </div>
        <div className="hero-art" aria-label="Illustration of a one rupya entry ticket">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <span className="art-caption">ONE SMALL START</span>
          <div className="entry-ticket">
            <div className="ticket-top"><span>1RUPYA</span><Icon name="ticket" /></div>
            <div className="ticket-amount"><small>FROM PKR</small><strong>1<span>.00</span></strong></div>
            <div className="ticket-bottom"><span>A little chance.<br />A bigger possibility.</span><span className="ticket-star">✳</span></div>
            <div className="ticket-stub"><span>YOUR POSSIBILITY STARTS HERE</span><div className="barcode" /></div>
          </div>
          <div className="proof-float"><span className="proof-icon"><Icon name="shield" /></span><div><strong>Fairness you can check</strong><span>Public, verifiable draw results</span></div></div>
          <span className="art-footnote">Ticket illustration · Prizes vary by draw</span>
        </div>
      </section>

      <div className="confidence-strip"><p>Small entry.<br /><strong>Clear expectations.</strong></p><span><Icon name="ticket" /> Tickets from PKR 1</span><span><Icon name="shield" /> Verifiable results</span><span><Icon name="wallet" /> EasyPaisa & JazzCash</span></div>

      <section id="draws" className="draw-section">
        <div className="section-heading"><div><p className="eyebrow">FIND YOUR NEXT POSSIBILITY</p><h2>Discover the draws<span>.</span></h2></div><Link href="/winners" className="text-link">View past results <Icon name="arrow" /></Link></div>
        {draws.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{draws.map(d => <DrawCard key={d.id} draw={d} />)}</div> : <div className="draw-empty"><div className="empty-icon"><Icon name="ticket" /></div><div><h3>{unavailable ? "Draws are temporarily unavailable" : "Good things are worth the wait."}</h3><p>{unavailable ? "We couldn’t load the draw list. Please try again shortly before making a payment." : "There are no open draws right now. Check back for the next opportunity."}</p></div><a href="/" className="btn-ghost">Refresh draws <Icon name="arrow" /></a></div>}
        <p className="draw-disclaimer">18+ only. A ticket is a chance to win, never a guarantee. Check each draw’s price, deadline and ticket limit before entering.</p>
      </section>

      <section id="how-it-works" className="how-section"><div className="how-intro"><p className="eyebrow">A SIMPLE START</p><h2>Three steps.<br />Nothing hidden.</h2><p>From your first rupya to the final result, here’s how it works.</p><Link href="/signup" className="text-link">Get started <Icon name="arrow" /></Link></div><div className="steps">{[
        ["01", "wallet", "Top up your wallet", "Add PKR 50 or more using EasyPaisa or JazzCash. Your payment is manually checked before credit is added."],
        ["02", "ticket", "Choose your possibility", "Pick an open draw, review its rules and buy tickets. Your assigned ticket numbers appear in your account."],
        ["03", "shield", "Check the result", "Once every ticket sells, the admin runs the draw. The published proof lets you independently verify the winner."],
      ].map(([number, icon, title, description]) => <div className="step" key={number}><span className="step-number">{number}</span><div><h3>{title}</h3><p>{description}</p></div><Icon name={icon as "wallet" | "ticket" | "shield"} /></div>)}</div></section>

      <section id="fairness" className="fairness-panel"><div><p className="eyebrow">TRUST STARTS WITH TRANSPARENCY</p><h2>Don’t just take our word.<br /><em>Check the proof.</em></h2><p>Each completed draw publishes its result and verification details. Follow the ticket progress and inspect the formula behind the winning number.</p><Link href="/winners" className="btn-gold">Explore published results <Icon name="arrow" /></Link></div><div className="fairness-details"><Icon name="shield" /><h3>Know before you enter</h3><p><Icon name="check" /> A draw runs only after every ticket sells.</p><p><Icon name="check" /> The admin initiates the draw manually.</p><p><Icon name="check" /> Cancelled draws return ticket funds to wallets.</p><p><Icon name="check" /> Completed results can be checked publicly.</p></div></section>
      <section className="faq-section"><div><p className="eyebrow">THE DETAILS MATTER</p><h2>A little more clarity.</h2></div><div>{[
        ["Is a prize guaranteed?", "No. Each ticket gives you a chance in that draw. Only the selected winning ticket wins the prize."],
        ["When does the draw happen?", "Every ticket must sell first. The admin then initiates the draw; reaching the ticket target does not immediately select a winner."],
        ["What happens if a draw is cancelled?", "When the admin cancels a draw, its ticket payments are refunded to the participants’ 1Rupya wallets."],
        ["How can I verify a winner?", "Open Past results and choose Verify result on a completed draw to inspect the published proof and recalculate the winning ticket."],
      ].map(([q,a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>
    </div>
  );
}
