-- 1Rupya database schema for Supabase (PostgreSQL).
-- Run this whole file once in: Supabase Dashboard -> SQL Editor -> New query.
--
-- Security model:
--   * Tables have Row Level Security (RLS) ON. Browsers can only READ what the policies allow.
--   * ALL writes (top-ups, buying tickets, drawing winners) go through SECURITY DEFINER
--     functions below, so a user can never edit their own balance or tickets from the browser.
--   * Whole amounts only (integer PKR). No paisa, no rounding bugs.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  phone       text,
  is_admin    boolean not null default false,
  balance     integer not null default 0 check (balance >= 0),
  created_at  timestamptz not null default now()
);
-- When the player last opened their notifications (drives the unread badge).
alter table public.profiles add column if not exists notifications_seen_at timestamptz not null default now();

-- Auto-create a profile when someone signs up (Google, email link or email + password).
-- The sign-up form sends full_name and phone as user metadata; the phone is kept only if it is a
-- valid Pakistani mobile number (same rule as update_profile), otherwise the user adds it on /profile.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_phone text := regexp_replace(coalesce(new.raw_user_meta_data->>'phone', ''), '[\s-]', '', 'g');
        v_name  text := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), '');
begin
  if v_phone !~ '^(03[0-9]{9}|\+923[0-9]{9})$' then v_phone := null; end if;
  -- seen_at slightly in the past so the welcome message below shows as unread.
  insert into public.profiles (id, email, full_name, phone, notifications_seen_at)
  values (new.id, new.email, left(v_name, 80), v_phone, now() - interval '1 second')
  on conflict (id) do nothing;
  insert into public.notifications (user_id, kind, title, body, link)
  values (new.id, 'welcome', 'Welcome to 1Rupya!',
          'Add money to your wallet, pick a draw and buy your tickets. Every update about your draws will appear here.', '/wallet');
  return new;
end $$;

-- Keep profiles.email in sync if a user changes their login email.
create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- ---------------------------------------------------------------- wallet ledger
create table if not exists public.wallet_txns (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  amount      integer not null,                     -- + credit, - debit
  kind        text not null check (kind in ('topup','ticket','refund','adjust')),
  ref         text,                                  -- topup id / draw id
  created_at  timestamptz not null default now()
);
create index if not exists wallet_txns_user_idx on public.wallet_txns(user_id, created_at desc);

-- ---------------------------------------------------------------- top-ups (manual EasyPaisa / JazzCash)
create table if not exists public.topups (
  id             bigserial primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  amount         integer not null check (amount >= 1),
  trx_id         text not null,
  method         text not null check (method in ('easypaisa','jazzcash','bank','other')),
  sender_name    text,
  status         text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note     text,
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz,
  reviewed_by    uuid references public.profiles(id)
);
-- The same transaction ID can never be submitted twice (fraud / double-credit guard).
create unique index if not exists topups_trx_unique on public.topups (lower(trim(trx_id)));
-- Payment proof + "pay to join a draw" (draw_id/qty set when the player paid for tickets in one draw).
alter table public.topups add column if not exists screenshot_path text;
alter table public.topups add column if not exists screenshot_sha  text;
alter table public.topups add column if not exists sender_account  text;
alter table public.topups add column if not exists draw_id uuid;
alter table public.topups add column if not exists qty integer check (qty is null or qty >= 1);
alter table public.topups add column if not exists result text;           -- what happened on approval (shown to admin/player)
-- The same screenshot can never be submitted twice.
create unique index if not exists topups_screenshot_unique on public.topups (screenshot_sha) where screenshot_sha is not null;
create index if not exists topups_status_idx on public.topups(status, created_at);

-- ---------------------------------------------------------------- draws
create table if not exists public.draws (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  image_url        text,
  ticket_price     integer not null check (ticket_price between 1 and 100),
  target_tickets   integer not null check (target_tickets between 2 and 100000),
  max_per_user     integer not null check (max_per_user >= 1),
  sold_tickets     integer not null default 0,
  status           text not null default 'open' check (status in ('open','full','drawn','cancelled')),
  ends_at          timestamptz,
  opens_at         timestamptz,                      -- optional: ticket sales start at this time ("coming soon")
  -- Provably-fair commitment: the hash of a secret seed is PUBLISHED when the draw is created,
  -- BEFORE any ticket is sold. The seed itself is revealed after the draw.
  seed_hash        text not null,
  seed_revealed    text,
  winner_ticket    integer,
  winner_user_id   uuid references public.profiles(id),
  winner_label     text,                             -- masked public name, e.g. "Ali K***"
  proof            jsonb,
  full_at          timestamptz,
  drawn_at         timestamptz,
  created_at       timestamptz not null default now()
);

alter table public.draws add column if not exists opens_at timestamptz;
alter table public.draws add column if not exists gallery text[] not null default '{}';    -- extra product photos
alter table public.draws add column if not exists facts text[] not null default '{}';      -- "Brand: Samsung", "Storage: 128GB" ...
alter table public.draws add column if not exists prize_value integer;                      -- market value in PKR (optional)
alter table public.draws add column if not exists participants integer not null default 0; -- distinct players
alter table public.draws add column if not exists delivery_image text;                      -- photo/video still of the prize handover
alter table public.draws add column if not exists delivery_note text;
alter table public.draws add column if not exists delivered_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'topups_draw_fk') then
    alter table public.topups add constraint topups_draw_fk foreign key (draw_id) references public.draws(id) on delete set null;
  end if;
end $$;

-- The secret seed lives here. RLS is on and there are NO policies, so only the
-- SECURITY DEFINER functions can ever read it.
create table if not exists public.draw_secrets (
  draw_id  uuid primary key references public.draws(id) on delete cascade,
  seed     text not null
);

create table if not exists public.tickets (
  id          bigserial primary key,
  draw_id     uuid not null references public.draws(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  number      integer not null,
  created_at  timestamptz not null default now(),
  unique (draw_id, number)
);
create index if not exists tickets_user_idx on public.tickets(user_id, draw_id);

-- Public, anonymised ticket list (ticket number + a one-way owner tag) so ANYONE can
-- re-compute the draw result. No names, no emails, no user IDs are exposed.
create or replace view public.draw_tickets_public as
  select t.draw_id,
         t.number,
         substr(encode(digest(t.user_id::text || ':' || t.draw_id::text, 'sha256'), 'hex'), 1, 10) as owner_tag
  from public.tickets t;

-- ---------------------------------------------------------------- in-app notifications
-- user_id NULL = broadcast to everyone (new draw, announcements). Rows are written only by the
-- SECURITY DEFINER functions below; players can only read their own + broadcasts.
create table if not exists public.notifications (
  id          bigserial primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('welcome','topup','ticket','soldout','result','win','refund','draw','announcement')),
  title       text not null,
  body        text,
  link        text,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, link) values (p_user, p_kind, p_title, p_body, p_link);
$$;
revoke all on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;

-- Backfill the participant count for draws created before this column existed.
update public.draws d set participants = (select count(distinct user_id) from public.tickets t where t.draw_id = d.id)
 where participants = 0 and sold_tickets > 0;

-- ---------------------------------------------------------------- site settings (set from /admin)
create table if not exists public.app_settings (
  key         text primary key check (key in ('pay_qr_url','pay_account_name','pay_easypaisa','pay_jazzcash','pay_bank','support_whatsapp','min_topup')),
  value       text,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- emails sent from /admin (prevents accidental double sends)
create table if not exists public.email_log (
  id          bigserial primary key,
  draw_id     uuid references public.draws(id) on delete cascade,
  kind        text not null,
  recipients  integer not null,
  sent_by     uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- "Ayesha Khan" -> "A**** K." : how players appear in public lists.
create or replace function public.mask_name(p_name text)
returns text language sql immutable as $$
  select left(f, 1) || repeat('*', greatest(2, least(length(f) - 1, 5)))
         || coalesce(' ' || left(nullif(split_part(n, ' ', 2), ''), 1) || '.', '')
    from (select coalesce(nullif(trim(p_name), ''), 'Player') as n) x,
         lateral (select split_part(coalesce(nullif(trim(p_name), ''), 'Player'), ' ', 1) as f) y
$$;

-- Public "who joined" list for each draw: masked name + ticket count + time. No ids, emails or phones.
create or replace view public.draw_participants_public as
  select t.draw_id,
         public.mask_name(p.full_name) as player,
         count(*)::integer as tickets,
         max(t.created_at) as joined_at
    from public.tickets t join public.profiles p on p.id = t.user_id
   group by t.draw_id, t.user_id, p.full_name;

-- Homepage trust numbers.
create or replace function public.public_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'players',   (select count(*) from public.profiles),
    'entries',   (select coalesce(sum(sold_tickets), 0) from public.draws where status in ('open','full','drawn')),
    'completed', (select count(*) from public.draws where status = 'drawn'),
    'delivered', (select count(*) from public.draws where delivered_at is not null),
    'refunded',  (select count(*) from public.draws where status = 'cancelled')
  )
$$;

-- ---------------------------------------------------------------- Row Level Security
alter table public.profiles     enable row level security;
alter table public.wallet_txns  enable row level security;
alter table public.topups       enable row level security;
alter table public.draws        enable row level security;
alter table public.draw_secrets enable row level security;
alter table public.tickets      enable row level security;
alter table public.notifications enable row level security;
alter table public.app_settings enable row level security;
alter table public.email_log enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "wallet read own or admin" on public.wallet_txns;
create policy "wallet read own or admin" on public.wallet_txns
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "topups read own or admin" on public.topups;
create policy "topups read own or admin" on public.topups
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "draws read all" on public.draws;
create policy "draws read all" on public.draws for select using (true);

drop policy if exists "tickets read own or admin" on public.tickets;
create policy "tickets read own or admin" on public.tickets
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications read own or broadcast" on public.notifications;
create policy "notifications read own or broadcast" on public.notifications
  for select using (user_id = auth.uid() or user_id is null);

drop policy if exists "settings read all" on public.app_settings;
create policy "settings read all" on public.app_settings for select using (true);

drop policy if exists "email log admin" on public.email_log;
create policy "email log admin" on public.email_log for select using (public.is_admin());

-- Nobody can insert/update/delete directly from the browser: no write policies exist.
revoke insert, update, delete on all tables in schema public from anon, authenticated;
grant select on public.draw_tickets_public to anon, authenticated;
grant select on public.notifications to authenticated;
grant select on public.app_settings to anon, authenticated;
grant select on public.email_log to authenticated;
grant select on public.draw_participants_public to anon, authenticated;
-- The secret seeds must never be readable from the browser, not even as an empty result.
revoke all on public.draw_secrets from anon, authenticated;

-- ---------------------------------------------------------------- functions (all writes)

-- Users may only change their own name and phone (never balance / is_admin).
create or replace function public.update_profile(p_full_name text, p_phone text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if length(trim(coalesce(p_full_name, ''))) < 3 then raise exception 'Please enter your full name'; end if;
  if coalesce(p_phone, '') !~ '^(03[0-9]{9}|\+923[0-9]{9})$' then
    raise exception 'Enter a valid Pakistani mobile number, e.g. 03001234567';
  end if;
  update public.profiles set full_name = trim(p_full_name), phone = p_phone where id = auth.uid();
end $$;

-- User submits a top-up request after paying via EasyPaisa / JazzCash.
drop function if exists public.submit_topup(integer, text, text, text);
create or replace function public.submit_topup(
  p_amount integer, p_trx_id text, p_method text, p_sender_name text,
  p_screenshot_path text default null, p_screenshot_sha text default null,
  p_draw uuid default null, p_qty integer default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_trx text := upper(trim(coalesce(p_trx_id, ''))); d public.draws; v_have integer;
        v_min integer := coalesce((select nullif(value, '')::integer from public.app_settings where key = 'min_topup'), 50);
        v_sender text := nullif(trim(coalesce(p_sender_name, '')), '');
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if coalesce((select phone from public.profiles where id = auth.uid()), '') = '' then
    raise exception 'Please complete your profile (name and phone) first';
  end if;
  if v_sender is null or length(v_sender) < 3 then raise exception 'Write the name on the account you paid from'; end if;
  if p_screenshot_path is null or p_screenshot_path not like auth.uid()::text || '/%' then
    raise exception 'Please upload a screenshot of your payment';
  end if;
  if v_trx !~ '^[0-9A-Z]{6,24}$' then raise exception 'Transaction ID looks invalid (6-24 letters/digits)'; end if;
  if p_amount > 50000 then raise exception 'Maximum single payment is PKR 50,000'; end if;

  if p_draw is not null then
    -- Paying to join one draw: the amount must match the tickets.
    select * into d from public.draws where id = p_draw;
    if not found or d.status <> 'open' then raise exception 'This draw is not open'; end if;
    if d.opens_at is not null and d.opens_at > now() then raise exception 'Tickets for this draw are not open yet'; end if;
    if coalesce(p_qty, 0) < 1 then raise exception 'Choose at least 1 ticket'; end if;
    if p_qty > d.target_tickets - d.sold_tickets then raise exception 'Only % tickets left', d.target_tickets - d.sold_tickets; end if;
    select count(*) into v_have from public.tickets where draw_id = p_draw and user_id = auth.uid();
    if v_have + p_qty > d.max_per_user then
      raise exception 'Limit is % tickets per person for this draw (you have %)', d.max_per_user, v_have;
    end if;
    if p_amount <> p_qty * d.ticket_price then raise exception 'Amount must be PKR % for % ticket(s)', p_qty * d.ticket_price, p_qty; end if;
  else
    if p_amount < v_min then raise exception 'Minimum top-up is PKR %', v_min; end if;
  end if;

  if (select count(*) from public.topups where user_id = auth.uid() and status = 'pending') >= 5 then
    raise exception 'You already have 5 payments waiting for approval. Please wait.';
  end if;

  insert into public.topups (user_id, amount, trx_id, method, sender_name, sender_account, screenshot_path, screenshot_sha, draw_id, qty)
  values (auth.uid(), p_amount, v_trx, p_method, v_sender, v_sender, p_screenshot_path, nullif(p_screenshot_sha, ''), p_draw,
          case when p_draw is null then null else p_qty end)
  returning id into v_id;

  perform public.notify(auth.uid(), 'topup',
    case when p_draw is null then 'Payment received — PKR ' || p_amount || ' under review'
         else 'Payment received for ' || d.title end,
    case when p_draw is null then 'TRX ' || v_trx || '. We check every payment by hand; your wallet is credited once it is confirmed.'
         else p_qty || ' ticket(s), PKR ' || p_amount || ', TRX ' || v_trx || '. Once we confirm the payment you are entered automatically and get an email.' end,
    case when p_draw is null then '/wallet' else '/draws/' || p_draw end);
  return v_id;
exception when unique_violation then
  if sqlerrm like '%screenshot%' then raise exception 'This screenshot was already submitted'; end if;
  raise exception 'This transaction ID was already submitted';
end $$;

-- Admin approves / rejects a top-up. Approval credits the wallet exactly once.
drop function if exists public.review_topup(bigint, boolean, text);
create or replace function public.review_topup(p_topup_id bigint, p_approve boolean, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t public.topups; v_buy jsonb; v_err text; v_result text;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into t from public.topups where id = p_topup_id for update;
  if not found then raise exception 'Top-up not found'; end if;
  if t.status <> 'pending' then raise exception 'Already reviewed'; end if;

  update public.topups
     set status = case when p_approve then 'approved' else 'rejected' end,
         admin_note = nullif(trim(coalesce(p_note, '')), ''), reviewed_at = now(), reviewed_by = auth.uid()
   where id = p_topup_id;

  if not p_approve then
    perform public.notify(t.user_id, 'topup', 'Payment of PKR ' || t.amount || ' was not approved',
      coalesce('Reason: ' || nullif(trim(p_note), ''), 'We could not match TRX ' || t.trx_id || ' to a payment. Contact support if you paid.'),
      case when t.draw_id is null then '/wallet' else '/draws/' || t.draw_id end);
    return jsonb_build_object('approved', false, 'user_id', t.user_id);
  end if;

  update public.profiles set balance = balance + t.amount where id = t.user_id;
  insert into public.wallet_txns (user_id, amount, kind, ref) values (t.user_id, t.amount, 'topup', t.id::text);

  if t.draw_id is null then
    perform public.notify(t.user_id, 'topup', 'PKR ' || t.amount || ' added to your wallet',
      'Your payment (TRX ' || t.trx_id || ') was confirmed. You can buy tickets now.', '/#draws');
    update public.topups set result = 'wallet' where id = p_topup_id;
    return jsonb_build_object('approved', true, 'user_id', t.user_id, 'entered', false, 'amount', t.amount);
  end if;

  -- Paid for a draw: enter them now. If that is no longer possible (sold out, limit), the money stays in the wallet.
  begin
    v_buy := public.buy_tickets_for(t.user_id, t.draw_id, t.qty);
    v_result := 'entered #' || (v_buy->>'first') || '-' || (v_buy->>'last');
  exception when others then
    v_err := sqlerrm;
    v_result := 'wallet: ' || v_err;
    perform public.notify(t.user_id, 'topup', 'Payment confirmed — PKR ' || t.amount || ' is in your wallet',
      'We could not enter you automatically (' || v_err || '). Your money is safe in your wallet; use it on any open draw.', '/wallet');
  end;
  update public.topups set result = v_result where id = p_topup_id;
  return jsonb_build_object('approved', true, 'user_id', t.user_id, 'entered', v_buy is not null, 'amount', t.amount,
                            'first', v_buy->>'first', 'last', v_buy->>'last', 'title', v_buy->>'title', 'draw_id', t.draw_id,
                            'error', v_err);
end $$;

-- Admin creates a draw. The secret seed is generated here and only its hash is public.
drop function if exists public.create_draw(text, text, text, integer, integer, integer, timestamptz);
create or replace function public.create_draw(
  p_title text, p_description text, p_image_url text,
  p_ticket_price integer, p_target integer, p_max_per_user integer, p_ends_at timestamptz,
  p_opens_at timestamptz default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := gen_random_uuid(); v_seed text := encode(gen_random_bytes(32), 'hex'); v_max integer;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  -- Default cap: one person can hold at most 20% of the tickets.
  v_max := coalesce(nullif(p_max_per_user, 0), greatest(1, (p_target * 20) / 100));
  if p_opens_at is not null and p_ends_at is not null and p_ends_at <= p_opens_at then
    raise exception 'The deadline must be after the opening time';
  end if;
  insert into public.draws (id, title, description, image_url, ticket_price, target_tickets, max_per_user, ends_at, opens_at, seed_hash)
  values (v_id, trim(p_title), nullif(trim(coalesce(p_description,'')), ''), nullif(trim(coalesce(p_image_url,'')), ''),
          p_ticket_price, p_target, v_max, p_ends_at, p_opens_at, encode(digest(v_seed, 'sha256'), 'hex'));
  insert into public.draw_secrets (draw_id, seed) values (v_id, v_seed);
  perform public.notify(null, 'draw',
    case when p_opens_at is not null and p_opens_at > now()
         then 'Coming soon: ' || trim(p_title)
         else 'New draw open: ' || trim(p_title) end,
    case when p_opens_at is not null and p_opens_at > now()
         then 'Tickets open ' || to_char(p_opens_at at time zone 'Asia/Karachi', 'Dy DD Mon, HH12:MI AM') || ' (PKT). ' || p_ticket_price || ' PKR per ticket, ' || p_target || ' tickets.'
         else 'PKR ' || p_ticket_price || ' per ticket, ' || p_target || ' tickets. Get yours before it sells out.' end,
    '/draws/' || v_id);
  return v_id;
end $$;

-- Buy tickets. One atomic transaction: lock draw -> check balance -> debit -> assign numbers.
-- Internal: buys tickets for p_user from their wallet. Called by buy_tickets (the player) and review_topup (admin approval).
create or replace function public.buy_tickets_for(p_user uuid, p_draw uuid, p_qty integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d public.draws; v_cost integer; v_have integer; v_first integer; v_bal integer;
begin
  if p_qty < 1 then raise exception 'Choose at least 1 ticket'; end if;

  if coalesce((select phone from public.profiles where id = p_user), '') = '' then
    raise exception 'Please complete your profile (name and phone) first';
  end if;

  select * into d from public.draws where id = p_draw for update;
  if not found then raise exception 'Draw not found'; end if;
  if d.status <> 'open' then raise exception 'This draw is no longer open'; end if;
  if d.ends_at is not null and d.ends_at < now() then raise exception 'This draw has expired'; end if;
  if d.opens_at is not null and d.opens_at > now() then
    raise exception 'Tickets for this draw open on % (PKT)', to_char(d.opens_at at time zone 'Asia/Karachi', 'DD Mon, HH12:MI AM');
  end if;
  if p_qty > d.target_tickets - d.sold_tickets then
    raise exception 'Only % tickets left', d.target_tickets - d.sold_tickets;
  end if;

  select count(*) into v_have from public.tickets where draw_id = p_draw and user_id = p_user;
  if v_have + p_qty > d.max_per_user then
    raise exception 'Limit is % tickets per person for this draw (you have %)', d.max_per_user, v_have;
  end if;

  v_cost := p_qty * d.ticket_price;
  select balance into v_bal from public.profiles where id = p_user for update;
  if v_bal < v_cost then raise exception 'Not enough balance. Need PKR %, you have PKR %', v_cost, v_bal; end if;

  update public.profiles set balance = balance - v_cost where id = p_user;
  insert into public.wallet_txns (user_id, amount, kind, ref) values (p_user, -v_cost, 'ticket', p_draw::text);

  v_first := d.sold_tickets + 1;
  insert into public.tickets (draw_id, user_id, number)
  select p_draw, p_user, n from generate_series(v_first, d.sold_tickets + p_qty) as n;

  update public.draws
     set sold_tickets = sold_tickets + p_qty,
         participants = participants + case when v_have = 0 then 1 else 0 end,
         status = case when sold_tickets + p_qty >= target_tickets then 'full' else status end,
         full_at = case when sold_tickets + p_qty >= target_tickets then now() else full_at end
   where id = p_draw;

  perform public.notify(p_user, 'ticket', 'You''re in: ' || d.title,
    case when p_qty = 1 then 'Ticket #' || v_first else 'Tickets #' || v_first || ' to #' || (d.sold_tickets + p_qty) end
      || ' (PKR ' || v_cost || '). We''ll tell you here the moment the draw sells out and the winner is picked.',
    '/draws/' || p_draw);

  if d.sold_tickets + p_qty >= d.target_tickets then
    insert into public.notifications (user_id, kind, title, body, link)
    select distinct t.user_id, 'soldout', 'Sold out: ' || d.title,
           'Every ticket is sold. The winner will be drawn soon — watch this space.', '/draws/' || p_draw
      from public.tickets t where t.draw_id = p_draw;
  end if;

  return jsonb_build_object('first', v_first, 'last', d.sold_tickets + p_qty, 'cost', v_cost, 'title', d.title);
end $$;
revoke all on function public.buy_tickets_for(uuid, uuid, integer) from public, anon, authenticated;

create or replace function public.buy_tickets(p_draw uuid, p_qty integer)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  return public.buy_tickets_for(auth.uid(), p_draw, p_qty);
end $$;

-- Admin runs the draw. Only allowed when EVERY ticket is sold (status = 'full').
--
-- Provably fair recipe (anyone can re-check it on /verify/<draw id>):
--   1. seed_hash = sha256(seed) was published before the first ticket was sold.
--   2. fingerprint = sha256("1:tagA,2:tagB,...") over the final public ticket list.
--   3. final = sha256(seed || ":" || fingerprint || ":" || beacon)
--      (beacon = optional public randomness, e.g. a drand round, fetched at draw time)
--   4. winning ticket = (first 15 hex digits of final, as a number) mod target + 1
create or replace function public.draw_winner(p_draw uuid, p_beacon text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d public.draws; v_seed text; v_fp text; v_final text; v_win integer; v_user uuid;
        v_name text; v_label text; v_proof jsonb;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into d from public.draws where id = p_draw for update;
  if not found then raise exception 'Draw not found'; end if;
  if d.status <> 'full' then raise exception 'Draw can only run when all tickets are sold'; end if;

  select seed into v_seed from public.draw_secrets where draw_id = p_draw;

  select encode(digest(string_agg(number::text || ':' || owner_tag, ',' order by number), 'sha256'), 'hex')
    into v_fp from public.draw_tickets_public where draw_id = p_draw;

  v_final := encode(digest(v_seed || ':' || v_fp || ':' || coalesce(p_beacon, ''), 'sha256'), 'hex');
  v_win := (('x' || substr(v_final, 1, 15))::bit(60)::bigint % d.target_tickets)::integer + 1;

  select user_id into v_user from public.tickets where draw_id = p_draw and number = v_win;
  select full_name into v_name from public.profiles where id = v_user;
  v_label := public.mask_name(v_name);

  v_proof := jsonb_build_object('seed', v_seed, 'seed_hash', d.seed_hash, 'fingerprint', v_fp,
                                'beacon', coalesce(p_beacon, ''), 'final_hash', v_final,
                                'winning_ticket', v_win, 'target', d.target_tickets);

  update public.draws
     set status = 'drawn', winner_ticket = v_win, winner_user_id = v_user, winner_label = v_label,
         seed_revealed = v_seed, proof = v_proof, drawn_at = now()
   where id = p_draw;

  insert into public.notifications (user_id, kind, title, body, link)
  select distinct t.user_id,
         case when t.user_id = v_user then 'win' else 'result' end,
         case when t.user_id = v_user then 'You won ' || d.title || '!' else 'Result: ' || d.title end,
         case when t.user_id = v_user
              then 'Your ticket #' || v_win || ' was drawn. We will call you on your registered number to arrange the prize.'
              else 'Winning ticket #' || v_win || ' (' || v_label || '). Thanks for playing — you can verify the result yourself.' end,
         '/verify/' || p_draw
    from public.tickets t where t.draw_id = p_draw;

  return v_proof;
end $$;

-- Admin cancels a draw (e.g. target not reached by the deadline) and refunds everyone.
create or replace function public.cancel_draw(p_draw uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare d public.draws; r record; v_users integer := 0;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into d from public.draws where id = p_draw for update;
  if not found then raise exception 'Draw not found'; end if;
  if d.status in ('drawn', 'cancelled') then raise exception 'Draw already %', d.status; end if;

  for r in select user_id, count(*)::integer as qty from public.tickets where draw_id = p_draw group by user_id loop
    update public.profiles set balance = balance + r.qty * d.ticket_price where id = r.user_id;
    insert into public.wallet_txns (user_id, amount, kind, ref) values (r.user_id, r.qty * d.ticket_price, 'refund', p_draw::text);
    perform public.notify(r.user_id, 'refund', 'Refunded: ' || d.title,
      'This draw was cancelled. PKR ' || (r.qty * d.ticket_price) || ' for your ' || r.qty || ' ticket(s) is back in your wallet.', '/wallet');
    v_users := v_users + 1;
  end loop;

  delete from public.tickets where draw_id = p_draw;
  update public.draws set status = 'cancelled', sold_tickets = 0, participants = 0 where id = p_draw;
  -- Pending "pay to join" requests for this draw become plain wallet top-ups when approved.
  update public.topups set draw_id = null, qty = null where draw_id = p_draw and status = 'pending';
  return v_users;
end $$;

-- Player opened the notifications page: clear the unread badge.
create or replace function public.mark_notifications_seen()
returns void language sql security definer set search_path = public as $$
  update public.profiles set notifications_seen_at = now() where id = auth.uid();
$$;

-- Admin sends a message to every player (e.g. "Next lucky draw opens Friday 9 PM").
create or replace function public.admin_announce(p_title text, p_body text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if length(trim(coalesce(p_title, ''))) < 3 then raise exception 'Write a title'; end if;
  if p_link is not null and p_link <> '' and p_link !~ '^/' then raise exception 'Link must start with / (a page on this site)'; end if;
  perform public.notify(null, 'announcement', left(trim(p_title), 120), nullif(left(trim(coalesce(p_body, '')), 600), ''), nullif(trim(coalesce(p_link, '')), ''));
end $$;

-- Admin edits product details (photos, facts, value). The title is locked once tickets are sold.
create or replace function public.update_draw_details(
  p_draw uuid, p_title text, p_description text, p_image_url text, p_gallery text[], p_facts text[], p_prize_value integer)
returns void language plpgsql security definer set search_path = public as $$
declare d public.draws;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into d from public.draws where id = p_draw for update;
  if not found then raise exception 'Draw not found'; end if;
  if d.sold_tickets > 0 and trim(coalesce(p_title, '')) <> d.title then
    raise exception 'The title cannot change after tickets are sold';
  end if;
  update public.draws
     set title = coalesce(nullif(trim(p_title), ''), title),
         description = nullif(trim(coalesce(p_description, '')), ''),
         image_url = nullif(trim(coalesce(p_image_url, '')), ''),
         gallery = coalesce((select array_agg(trim(x)) from unnest(p_gallery) x where trim(x) <> ''), '{}'),
         facts = coalesce((select array_agg(left(trim(x), 120)) from unnest(p_facts) x where trim(x) <> ''), '{}'),
         prize_value = nullif(p_prize_value, 0)
   where id = p_draw;
end $$;

-- After the winner receives the prize: publish a handover photo + note (big trust builder).
create or replace function public.set_delivery_proof(p_draw uuid, p_image text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare d public.draws;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into d from public.draws where id = p_draw for update;
  if not found then raise exception 'Draw not found'; end if;
  if d.status <> 'drawn' then raise exception 'Only completed draws can be marked delivered'; end if;
  update public.draws set delivery_image = nullif(trim(coalesce(p_image, '')), ''), delivery_note = nullif(trim(coalesce(p_note, '')), ''),
                          delivered_at = coalesce(delivered_at, now())
   where id = p_draw;
  if d.winner_user_id is not null and d.delivered_at is null then
    perform public.notify(d.winner_user_id, 'win', 'Prize delivered: ' || d.title, 'Enjoy your prize! Thanks for playing on 1Rupya.', '/winners');
  end if;
end $$;

create or replace function public.admin_set_setting(p_key text, p_value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_key = 'min_topup' and coalesce(p_value, '') !~ '^[0-9]{1,6}$' then raise exception 'Minimum top-up must be a number'; end if;
  insert into public.app_settings (key, value, updated_at) values (p_key, nullif(trim(coalesce(p_value, '')), ''), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end $$;

create or replace function public.log_email(p_draw uuid, p_kind text, p_recipients integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  insert into public.email_log (draw_id, kind, recipients, sent_by) values (p_draw, p_kind, p_recipients, auth.uid());
end $$;

-- Admin dashboard numbers in one call.
create or replace function public.admin_stats()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'users',           (select count(*) from public.profiles),
    'open_draws',      (select count(*) from public.draws where status in ('open','full')),
    'pending_topups',  (select count(*) from public.topups where status = 'pending'),
    'approved_total',  (select coalesce(sum(amount), 0) from public.topups where status = 'approved'),
    'wallet_liability',(select coalesce(sum(balance), 0) from public.profiles),
    'ticket_revenue',  (select coalesce(sum(d.ticket_price * d.sold_tickets), 0) from public.draws d where d.status in ('open','full','drawn'))
  );
end $$;

grant execute on function
  public.update_profile(text, text),
  public.submit_topup(integer, text, text, text, text, text, uuid, integer),
  public.review_topup(bigint, boolean, text),
  public.update_draw_details(uuid, text, text, text, text[], text[], integer),
  public.set_delivery_proof(uuid, text, text),
  public.admin_set_setting(text, text),
  public.log_email(uuid, text, integer),
  public.create_draw(text, text, text, integer, integer, integer, timestamptz, timestamptz),
  public.mark_notifications_seen(),
  public.admin_announce(text, text, text),
  public.buy_tickets(uuid, integer),
  public.draw_winner(uuid, text),
  public.cancel_draw(uuid),
  public.admin_stats(),
  public.public_stats(),
  public.is_admin()
to authenticated;

-- ---------------------------------------------------------------- make yourself admin
-- 1) Sign in once on the website with your own account.
-- 2) Then run this (change the email):
--    update public.profiles set is_admin = true where email = 'you@example.com';

-- ---------------------------------------------------------------- file storage (Supabase Storage)
--  payment-proofs : PRIVATE. Players upload into their own folder (<user id>/...); only they and admins can view.
--  public-images  : public. Admin-only uploads: product photos, payment QR, prize delivery photos.
do $$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise notice 'storage schema not found (plain Postgres test run) - skipping buckets';
    return;
  end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg','image/png','image/webp']),
         ('public-images', 'public-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
  on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
                                 allowed_mime_types = excluded.allowed_mime_types;

  execute 'drop policy if exists "proofs upload own folder" on storage.objects';
  execute $p$create policy "proofs upload own folder" on storage.objects for insert to authenticated
           with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  execute 'drop policy if exists "proofs read own or admin" on storage.objects';
  execute $p$create policy "proofs read own or admin" on storage.objects for select to authenticated
           using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()))$p$;
  execute 'drop policy if exists "public images admin write" on storage.objects';
  execute $p$create policy "public images admin write" on storage.objects for insert to authenticated
           with check (bucket_id = 'public-images' and public.is_admin())$p$;
  execute 'drop policy if exists "public images admin update" on storage.objects';
  execute $p$create policy "public images admin update" on storage.objects for update to authenticated
           using (bucket_id = 'public-images' and public.is_admin())$p$;
  execute 'drop policy if exists "public images admin delete" on storage.objects';
  execute $p$create policy "public images admin delete" on storage.objects for delete to authenticated
           using (bucket_id = 'public-images' and public.is_admin())$p$;
end $$;
