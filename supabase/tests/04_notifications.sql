-- Notifications: payment received/approved, participation, sold out, result/win, upcoming draws, announcements.
-- Run after 00_stub + schema (fresh database).
\set ON_ERROR_STOP off
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'n' || g || '@test.pk',
       jsonb_build_object('full_name', 'Player Number' || g, 'phone', '0300' || lpad(g::text, 7, '0'))
from generate_series(0, 3) g;
update public.profiles set is_admin = true where email = 'n0@test.pk';
create or replace function pg_temp.as_user(n int) returns void language sql as $$
  select set_config('request.jwt.claim.sub', ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0')), false)
$$;

\echo '--- welcome notification on sign-up (expect 4)'
select count(*) from public.notifications where kind = 'welcome';

\echo '--- top-up submitted + approved'
select pg_temp.as_user(1); select public.submit_topup(100, 'TRXN00000001', 'easypaisa', 'x');
select pg_temp.as_user(2); select public.submit_topup(100, 'TRXN00000002', 'jazzcash', 'x');
select pg_temp.as_user(0);
select public.review_topup(id, true, null) from public.topups order by id;
select user_id, title from public.notifications where kind = 'topup' order by id;

\echo '--- upcoming draw: broadcast + buying blocked'
select public.create_draw('Future Phone', '', '', 1, 4, 0, now() + interval '3 days', now() + interval '1 day') as future_id \gset
select title, user_id is null as broadcast from public.notifications where kind = 'draw';
select pg_temp.as_user(1); select public.buy_tickets(:'future_id', 1);

\echo '--- open draw: participation, sold out, result'
select pg_temp.as_user(0);
select public.create_draw('Earbuds', '', '', 1, 4, 3, null, null) as d \gset
select pg_temp.as_user(1); select public.buy_tickets(:'d', 2);
select pg_temp.as_user(2); select public.buy_tickets(:'d', 2);
select count(*) as ticket_notes from public.notifications where kind = 'ticket';      -- expect 2
select count(*) as soldout_notes from public.notifications where kind = 'soldout';    -- expect 2 (one per player)
select pg_temp.as_user(0); select public.draw_winner(:'d', '') is not null as drawn;
select kind, count(*) from public.notifications where kind in ('win','result') group by kind order by kind;  -- 1 win + 1 result

\echo '--- announcements: admin only'
select pg_temp.as_user(3); select public.admin_announce('Hack', 'x', '/');
select pg_temp.as_user(0); select public.admin_announce('Next draw Friday 9 PM', 'Stay tuned', '/#draws');
select count(*) as announcements from public.notifications where kind = 'announcement';  -- expect 1

\echo '--- players see own + broadcast only, cannot insert'
set role authenticated;
select pg_temp.as_user(3);
select kind, count(*) from public.notifications group by kind order by kind;   -- welcome 1, draw 2, announcement 1
insert into public.notifications (user_id, kind, title) values (auth.uid(), 'win', 'fake');
select public.notify(auth.uid(), 'win', 'fake', null, null);
select public.mark_notifications_seen();
reset role;
select notifications_seen_at > now() - interval '1 minute' as seen_updated from public.profiles where email = 'n3@test.pk';
