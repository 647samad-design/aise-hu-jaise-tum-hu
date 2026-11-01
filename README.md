# 🏆 JeetoPrizes

FastAPI + installable PWA (works in browser and can be installed as an app on Android/iOS).

**Flow:** sign up → complete registration (name, mobile, city, 18+) → pay entry fee (JazzCash/Easypaisa TID) → admin approves → N attempts → play 20s Whack-a-Mole →
server-verified score → live Top 20 (WebSocket) → contest ends → admin presses *Pick winner* →
provably-fair draw among Top 20.

## Features
- Email/password + optional Google One-Tap login
- Live Top 20 leaderboard (WebSockets), drop-out alerts, in-app + browser notifications
- Referral program (1 free attempt per friend, max 10)
- Server-side anti-cheat (session timing, tap-speed and count checks, auto-flag, admin remove/ban)
- Provably fair draw: SHA-256 commitment of the secret seed is public from day one; seed + HMAC proof revealed after the draw
- Admin panel `/admin`: dashboard, contests, live Top 20, payment approvals, anti-cheat, prize dispatch status
- PWA: manifest + service worker + icons ("Install app")

## Run locally
```bash
pip install -r requirements.txt
cp .env.example .env   # then export the variables (or set them in your host)
ADMIN_EMAIL=you@example.com AUTO_APPROVE_PAYMENTS=true uvicorn app.main:app --reload
```
Open http://localhost:8000 · register with `ADMIN_EMAIL` to become admin · panel at `/admin`.

## Deploy
Any host that runs Docker or Python (Render, Railway, Fly.io, VPS). Set the env vars from `.env.example`,
use PostgreSQL via `DATABASE_URL` in production, keep `AUTO_APPROVE_PAYMENTS=false`, serve over HTTPS (needed for PWA install).

## Before going live (important)
- **Legal:** a paid entry + random winner draw is treated as a lottery/gambling in many places (including Pakistan). Get local legal advice first.
- **Payments:** this version uses manual TID verification by admin. Automated JazzCash/Easypaisa needs a merchant account and their API credentials.
- **Phone OTP login** needs an SMS provider; **true push notifications** need VAPID keys. Not included.
- Add rate limiting (e.g. via your reverse proxy) and regular DB backups.

## Google One-Tap setup
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → *Web application*.
2. Authorized JavaScript origins: your site URL (https://yourdomain.com, and http://localhost:8000 for testing).
3. Put the client ID in `GOOGLE_CLIENT_ID`. The Google button + One-Tap popup then appear first on the login screen.

## Draw mode
`DRAW_MODE=random` (lucky draw among Top 20) or `DRAW_MODE=top` (highest score wins, skill only).

## Game: Whack-a-Mole (server-verified)
The server generates a random mole schedule per attempt (faster and denser over time, golden moles +3, bombs -3, misses -1).
The phone only sends taps; the server replays them to compute the score, rejects impossible tap speeds and flags
superhuman or robotic reaction times for admin review. Flagged scores stay off the leaderboard until an admin restores them.

## Login & registration
Production (`GOOGLE_CLIENT_ID` set): Google One-Tap only. After the first sign-in the player completes a short registration
(name, mobile number, city, 18+ and terms). No OTP; one mobile number per account. Admins and winners are contacted via that number.
Without `GOOGLE_CLIENT_ID` (local dev) email/password sign-in is enabled for testing.

## Legal pages
`/terms`, `/privacy`, `/rules` are templates. **Have a local lawyer review them** and set `COMPANY_NAME`, `CONTACT_EMAIL`, `WHATSAPP_NUMBER`.

> Existing SQLite databases from earlier versions need to be deleted (new columns were added): remove `app.db` before first run.

## Games (one per contest, chosen in the admin panel)
| Game | Key | Verification |
|---|---|---|
| Whack-a-Mole | `mole` | server schedule, taps replayed on server, reaction-time bot checks |
| Fruit Catch | `catch` | server schedule, item positions recomputed at tap time, visibility + pixel-perfect/robotic checks |

To add a game: add a generator + scorer + bot-check in `app/main.py`, register it in `GAMES`, and add its UI in `index.html`.
