# 1Rupya

Low-cost raffle / lucky-draw web app (PWA) for Pakistan. Users top up a wallet via EasyPaisa/JazzCash, buy
PKR 1-2 tickets, and a winner is drawn **only when every ticket is sold**, with a public, re-checkable formula.

**Stack:** Next.js 15 (App Router, TypeScript, Tailwind) · Supabase (Postgres + Auth) · hosted free on Vercel or Netlify.

## What is in the box

| Area | Features |
| --- | --- |
| Accounts | Sign up with email + password (name, phone, 18+ consent, password strength meter), sign in with password, Google or a one-time email link, forgot / reset password, change password, protected pages with return-to-where-you-were redirects |
| Players | Wallet with copy-to-clipboard payment numbers, top-up by TRX ID, buy tickets with confirmation, **My tickets** page (filters, wins, spend), account settings |
| Experience | Premium forest/champagne design across every page, phone bottom tab bar, user menu, live countdowns, share + WhatsApp buttons, toasts, 404 / error / loading screens, Terms and Privacy pages |
| Draws | Product cards with progress bar and deadline, per-person ticket cap, auto "sold out" state |
| Fairness | Commit-reveal draw + public randomness (drand), `/verify/<draw>` page that re-computes the winner in the visitor's browser |
| Admin | Dashboard numbers, approve/reject top-ups, create draws, draw winner, cancel + refund, user list |
| PWA | Web manifest, service worker, offline page, "Add to Home Screen" banner |
| Safety | All money logic lives in SQL functions; browsers cannot edit balances or tickets (RLS + no write policies) |

## Setup (about 15 minutes)

1. **Supabase project** — create a free project at supabase.com.
2. **Database** — Supabase → SQL Editor → paste all of `supabase/schema.sql` → Run.
3. **Auth URLs** — Supabase → Authentication → URL Configuration: set *Site URL* to your site and add
   `https://YOUR-SITE/auth/callback` and `http://localhost:3000/auth/callback` to *Redirect URLs*.
   **Email + password:** Authentication → Providers → Email must be enabled (it is by default). Keep
   *Confirm email* ON for production (new users get a confirmation link); turn it OFF only for quick local testing.
   Set *Minimum password length* to 8. For real traffic, add your own SMTP (Authentication → Emails → SMTP) —
   Supabase's built-in mailer only sends a few emails per hour.
4. **Google sign-in (optional)** — Authentication → Providers → Google: create OAuth credentials in Google Cloud
   Console and paste the client ID/secret. Email magic-link works without this.
5. **Env vars** — copy `.env.example` to `.env.local` and fill it in (Supabase URL + anon key from Project Settings → API,
   plus your EasyPaisa/JazzCash number and name).
6. **Run locally**
   ```bash
   npm install
   npm run dev
   ```
7. **Become admin** — sign in once on the site, then run in the SQL editor:
   ```sql
   update public.profiles set is_admin = true where email = 'you@example.com';
   ```
8. **Already running an older version?** Re-run `supabase/schema.sql` in the SQL editor. It is safe to run again
   (keeps your data) and installs the updated sign-up trigger that saves the name and phone from the sign-up form.
9. **Deploy** — import the GitHub repo into Vercel (or Netlify), add the same env vars, deploy. For Netlify,
   `netlify.toml` configures the Next.js build, `.next` publish directory, and Next.js runtime so server-rendered
   pages and authentication routes are served correctly. Add your own domain later; only the Supabase redirect
   URLs need updating.

## How the 100-person lucky draw works

1. Admin creates a draw (e.g. 100 tickets at PKR 2). The server makes a random secret **seed** and publishes only
   `sha256(seed)`. Nobody, including the admin's browser, can change the seed afterwards.
2. Users buy tickets. Each purchase is one atomic database transaction (lock draw, check balance, debit, assign numbers),
   so two people can never get the same ticket and the last ticket cannot be oversold.
3. When ticket #100 is sold the draw becomes **full**. Only then can the admin press *Draw winner*.
4. The server fetches a public randomness value from [drand](https://drand.love) and computes
   `sha256(seed : ticket-list fingerprint : drand value)`. The winner is `(first 15 hex digits) mod 100 + 1`.
5. The seed is revealed. Anyone can open `/verify/<draw id>` and re-run the maths in their own browser.

If the target is not reached by the deadline, *Cancel & refund* returns every ticket's money to wallets.

**Honest limits of this fairness model**

- The admin runs the draw manually, so they could wait and click at a moment that suits them. Draw immediately when a
  draw sells out, ideally live (WhatsApp status / TikTok live), and show the page. A fully automatic draw on the last
  ticket is a good next upgrade.
- The ticket list is public only as anonymous tags (`owner_tag`), so friends/fake accounts of the admin cannot be
  detected from it. Keep the per-person ticket cap and watch for many accounts with similar names/numbers.
- Supabase returns at most 1,000 rows per request by default; `/verify` needs all tickets of a draw, so keep draws
  at or under 1,000 tickets, or raise *Max rows* in Supabase API settings.

## Wallet and payment flow

Manual verification (no gateway fees on PKR 1-2 purchases): the user pays your EasyPaisa/JazzCash, enters the TRX ID,
you approve it in `/admin` after checking your own payment history. Duplicate TRX IDs are rejected by a unique index.
The minimum top-up is enforced in SQL (`submit_topup`, currently PKR 50); change it there and in
`NEXT_PUBLIC_MIN_TOPUP` together.

## Tests

`supabase/tests/` contains plain-SQL scenario tests (top-up, duplicate TRX, per-person cap, sold-out draw, direct
tampering attempts, winner re-check, cancel/refund). They run on any Postgres with the small Supabase stub included:

```bash
createdb t && psql -d t -f supabase/tests/00_stub_supabase.sql && psql -d t -f supabase/schema.sql
psql -d t -f supabase/tests/01_flow.sql && psql -d t -f supabase/tests/02_cancel_refund.sql
psql -d t -f supabase/tests/03_signup_profile.sql
```

## Before you take real money

- **Legal:** paid-entry raffles may fall under Pakistani gambling/lottery law. Get advice from a lawyer first.
- **Payments:** EasyPaisa/JazzCash can freeze personal accounts that receive many small transfers. Prefer a business
  account, and keep every wallet balance withdrawable (the *Owed to wallets* tile in `/admin` shows your liability).
- **Privacy:** you store names, phone numbers and TRX IDs. Never commit `.env.local` or tokens to Git.
- **Terms / Privacy pages:** `/terms` and `/privacy` are a plain-language starting point. Review them (prize claim
  window, refund rules, contact details) with your lawyer before launch.
- Start with a small group (20-50 people) and tell them it is a test.

## Project layout

```
src/app/            pages: / , /draws/[id], /tickets, /wallet, /profile, /winners, /verify/[id], /admin,
                    /login, /signup, /forgot-password, /reset-password, /terms, /privacy
src/app/auth/       auth server actions + /auth/callback (Google, email links, password recovery)
src/middleware.ts   session refresh + private-page guard
src/app/actions.ts  server actions (thin wrappers around the SQL functions)
src/components/     UI pieces (BuyTickets, TopupForm, Admin*, VerifyDraw, RegisterSW ...)
src/lib/            Supabase clients, formatting helpers
supabase/schema.sql tables, RLS policies, all money/draw functions
public/             manifest, service worker, icons
scripts/            icon generator (python3 scripts/make_icons.py)
```
