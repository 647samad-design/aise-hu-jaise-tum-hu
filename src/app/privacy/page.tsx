import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy · 1Rupya" };

const SECTIONS: [string, string][] = [
  ["What we collect", "Your name, email address and mobile number; the payment details you submit for top-ups (amount, method, transaction ID, sender name); your tickets and wallet history; and basic technical data needed to keep you signed in."],
  ["Why we collect it", "To run your account and wallet, verify payments, run draws, contact winners, prevent fraud and meet legal obligations. We do not sell your personal data and we do not use it for third-party advertising."],
  ["What is public", "Published results show only a masked winner name (for example “A*** K.”) and the winning ticket number. The public ticket list used for verification shows ticket numbers with an anonymous tag — never names, emails or phone numbers."],
  ["Where it is stored", "Data is stored with our database and authentication provider (Supabase). Passwords are never stored in readable form. Access to your data is restricted by database security rules."],
  ["How long we keep it", "We keep account and transaction records for as long as your account is active and for a reasonable period afterwards to resolve disputes and meet record-keeping duties."],
  ["Your choices", "You can update your name and phone in Account settings at any time. To close your account or request a copy or deletion of your data, contact support from your registered email. Any remaining wallet balance is settled before closure."],
];

export default function PrivacyPage() {
  return (
    <article className="page narrow legal">
      <header className="page-head">
        <p className="eyebrow">YOUR DATA</p>
        <h1>Privacy <em>policy</em></h1>
        <p>What we collect, why, and what stays private.</p>
      </header>
      {SECTIONS.map(([h, body], i) => (
        <section key={h}>
          <h2><span>{String(i + 1).padStart(2, "0")}</span>{h}</h2>
          <p>{body}</p>
        </section>
      ))}
    </article>
  );
}
