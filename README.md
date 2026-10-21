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
| Notifications | Bell + `/notifications`: payment received / approved / rejected, "you're in" after buying, sold out, result, **you won**, refunds, new and coming-soon draws, admin announcements to everyone |
| Coming-soon draws | Admin sets *Tickets open at*; players see a countdown and are notified; buying is blocked until then |
| Pay & join | Player uploads payment screenshot + sender account name + TID; admin verifies with the screenshot side by side; approval enters them in the draw and emails them |
| Admin | Tabs for Payments, Draws, New draw, Announce, Payment settings (upload QR), Players (search); product photo upload, facts, market value, email participants, prize-delivery proof |
| Trust | Participant count + live "who has joined" list on every draw, homepage numbers (players, tickets, draws completed, prizes delivered), delivery photos on Winners |
| Payment QR | Uploaded from /admin, shown on Wallet and Pay & join with a *Save QR* button for same-phone payments |
| SEO | Sitemap with every draw, robots.txt, canonical URLs, Google structured data (Organization, WebSite, FAQ, breadcrumbs), share images for WhatsApp/Facebook (site + each draw), private pages set to noindex, Search Console verification |
| Android / iPhone app | Installable app (PWA) with shortcuts and store-style screenshots, install banner, `/download` page with Android & iPhone steps and a QR for desktop visitors, optional APK via PWABuilder |
| PWA | Web manifest, service worker (fast repeat loads, offline page, never caches money data) |
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

## How a player joins a draw (pay & join)

1. Player opens a draw, picks how many tickets, taps **Pay & join**.
2. They send the money (QR or EasyPaisa/JazzCash number), **upload the screenshot**, write the **name on the account
   they paid from** and the **Transaction ID**.
3. The request appears in **/admin → Payments** with the screenshot, amount check and a warning if the sender name
   doesn't match the profile. You compare it with your EasyPaisa/JazzCash history.
4. **Approve** → the player is entered in the draw automatically, gets ticket numbers, a notification and an **email**
   ("You're in!"). If the draw sold out meanwhile, the money goes to their wallet instead and they are told.
   **Reject** → pick a reason; the player is notified and emailed.
5. Each draw shows how many people joined and a live "Who has joined" list (names partly hidden).
6. After the draw: **/admin → Draws → "Email result to all participants"** sends everyone the winner and the verify link
   in one click. Then **Mark prize delivered** with a handover photo — it shows on Winners and builds trust.

Players can still keep money in their wallet and buy instantly from it.

Screenshots are stored privately (only the player and admins can see them). The same screenshot or the same
Transaction ID can never be used twice.

## Payment QR and payment details

Go to **/admin → Payment settings**: upload your QR, enter account name, EasyPaisa / JazzCash numbers, bank/IBAN,
support WhatsApp and the minimum top-up. They show on Wallet and Pay & join immediately — no redeploy.

## Emails (Gmail)

App emails (approval "You're in!", rejection, "email all participants", announcements) go out from your Gmail:

1. Google Account → **Security** → turn on **2-Step Verification**.
2. Google Account → search **App passwords** → create one named `1Rupya` → copy the 16 letters.
3. In Netlify env vars set `EMAIL_HOST_USER` (your Gmail), `EMAIL_HOST_PASSWORD` (the 16 letters) and optionally
   `DEFAULT_FROM_EMAIL` (`1Rupya <your@gmail.com>`), then redeploy. Check **/setup-check** → Emails ✓.

Gmail sends about 500 emails a day from a normal account — enough to start. Sign-up confirmation and password-reset
emails come from Supabase; to send those from Gmail too: Supabase → Authentication → Emails → **SMTP Settings** →
host `smtp.gmail.com`, port `465`, username = your Gmail, password = the same app password, sender = your Gmail.

## Google sign-in

1. Google Cloud Console → APIs & Services → Credentials → your **OAuth client (Web application)**.
2. **Authorized redirect URIs**: add `https://YOUR-PROJECT.supabase.co/auth/v1/callback` (your Supabase Project URL + that path).
3. Supabase → Authentication → Sign In / Providers → **Google** → enable, paste **Client ID** and **Client Secret** → Save.

These two values are not app environment variables — they live only in Supabase.

## SEO checklist after going live

1. Set `NEXT_PUBLIC_SITE_URL` to your real domain (e.g. `https://1rupya.pk`) — sitemap, canonical URLs and share images use it.
2. Google Search Console → add your domain → copy the HTML-tag code into `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` → redeploy → Verify.
3. Search Console → Sitemaps → submit `sitemap.xml`.
4. Give every draw a clear title ("Samsung Galaxy A15 128GB") and a real photo — both appear in Google and in WhatsApp previews.

## Android app

**Easiest (recommended):** players open the site in Chrome and tap *Install app* (banner or `/download`). It installs
like a normal app (icon, full screen, shortcuts) in a second, is about 1 MB, and updates itself.

**APK file (optional):** go to [pwabuilder.com](https://www.pwabuilder.com), enter your live URL, choose *Android* →
*Generate package*. You get an `.apk` (to share directly) and an `.aab`, plus a signing key — keep that key safe.
Then set `ANDROID_PACKAGE_NAME` and `ANDROID_SHA256_FINGERPRINT` (both shown by PWABuilder) so
`/.well-known/assetlinks.json` lets the APK open full-screen, upload the APK somewhere public and set
`NEXT_PUBLIC_ANDROID_APK_URL` to show a *Download APK* button. Google Play only accepts real-money lottery /
raffle apps from licensed operators in allowed countries, so don't plan on a Play Store listing without a licence.

`public/screenshots/` holds the images Android shows in its install dialog; replace them with screenshots of your
live site once you have real draws.

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
# notifications test expects a fresh database:
createdb t2 && psql -d t2 -f supabase/tests/00_stub_supabase.sql && psql -d t2 -f supabase/schema.sql && psql -d t2 -f supabase/tests/04_notifications.sql
createdb t3 && psql -d t3 -f supabase/tests/00_stub_supabase.sql && psql -d t3 -f supabase/schema.sql && psql -d t3 -f supabase/tests/05_pay_to_join.sql
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
