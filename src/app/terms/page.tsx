import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of use · 1Rupya", alternates: { canonical: "/terms" } };

const SECTIONS: [string, React.ReactNode][] = [
  ["Who can play", "You must be 18 or older and legally allowed to take part in prize draws where you live. One account per person; duplicate or fake accounts can be closed and their tickets voided."],
  ["Your wallet", <>You add money by EasyPaisa, JazzCash or bank transfer and submit the transaction ID. Your wallet is credited only after the payment is verified. A transaction ID can be used once. The current minimum top-up is shown on the <Link href="/wallet">Wallet</Link> page.</>],
  ["Buying tickets", "Each draw shows its ticket price, number of tickets, per-person limit and deadline before you buy. Tickets are assigned in order and shown in your account straight away. Purchases cannot be reversed once made, except as described under cancelled draws."],
  ["How winners are chosen", <>A draw runs only after every ticket is sold. The winning ticket is computed from a secret seed committed before sales started, the final ticket list and public randomness. The full proof is published and anyone can recompute it on the draw&apos;s verify page. See <Link href="/#fairness">our promise</Link>.</>],
  ["Cancelled draws", "If a draw does not sell out by its deadline, or must be cancelled for another reason, every ticket's price is refunded to the buyer's 1Rupya wallet."],
  ["Prizes", "Winners are contacted on the mobile number in their profile. Keep it current. If a winner cannot be reached within 14 days, we may re-contact them through other details on the account before the prize is forfeited. Prizes are as described on the draw page and are not exchangeable for cash unless stated."],
  ["Fair play", "Using bots, multiple accounts, chargebacks or false transaction IDs is not allowed. We may suspend accounts and withhold balances connected to fraud while we investigate."],
  ["Changes", "We may update these terms. The version on this page applies to new ticket purchases from the date it is posted."],
];

export default function TermsPage() {
  return (
    <article className="page narrow legal">
      <header className="page-head">
        <p className="eyebrow">THE RULES</p>
        <h1>Terms of <em>use</em></h1>
        <p>Plain-language rules for playing on 1Rupya. Please read them before buying tickets.</p>
      </header>
      {SECTIONS.map(([h, body], i) => (
        <section key={h}>
          <h2><span>{String(i + 1).padStart(2, "0")}</span>{h}</h2>
          <p>{body}</p>
        </section>
      ))}
      <p className="legal-note">Participation does not guarantee a prize. Play only with money you can afford to spend.</p>
    </article>
  );
}
