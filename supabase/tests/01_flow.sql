\set ON_ERROR_STOP off
-- Supabase gives anon/authenticated SELECT on tables by default; mimic that.
grant select on all tables in schema public to anon, authenticated;

-- 1 admin + 20 players (profiles are created by the signup trigger)
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@test.pk',
       jsonb_build_object('full_name', 'Player Number' || g)
from generate_series(0, 20) g;
update public.profiles set is_admin = true, full_name = 'Admin Boss' where email = 'u0@test.pk';

create or replace function pg_temp.as_user(n int) returns void language sql as $$
  select set_config('request.jwt.claim.sub', ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0')), false)
$$;

\echo '--- profile + top-ups'
do $$ declare i int; begin
  for i in 1..20 loop
    perform pg_temp.as_user(i);
    perform public.update_profile('Player Number ' || i, '0300' || lpad(i::text, 7, '0'));
    perform public.submit_topup(100, 'TRX' || lpad(i::text, 9, '0'), 'easypaisa', 'Player');
  end loop;
end $$;
select count(*) as pending_topups from public.topups where status = 'pending';

\echo '--- duplicate TRX must fail'
select pg_temp.as_user(1);
select public.submit_topup(100, 'trx000000002 ', 'easypaisa', 'x');
select public.submit_topup(100, 'TRX000000001', 'easypaisa', 'x');

\echo '--- non-admin cannot approve'
select public.review_topup(1, true, null);

\echo '--- admin approves all'
select pg_temp.as_user(0);
select public.review_topup(id, true, null) from public.topups where status = 'pending' order by id;
select public.review_topup(1, true, null);  -- second approve must fail (no double credit)
select sum(balance) as total_balance from public.profiles;   -- expect 2000

\echo '--- create 100-ticket draw (price 2) as admin; non-admin must fail'
select pg_temp.as_user(1);
select public.create_draw('x', null, null, 2, 100, 0, null);
select pg_temp.as_user(0);
select public.create_draw('Smart Watch T800', 'test', null, 2, 100, 0, null) as draw_id \gset
select id, max_per_user, status, left(seed_hash, 12) as seed_hash from public.draws;

\echo '--- over per-person limit (21 > 20) must fail; insufficient balance must fail'
select pg_temp.as_user(1);
select public.buy_tickets(:'draw_id', 21);
update public.profiles set balance = 3 where id = auth.uid();
select public.buy_tickets(:'draw_id', 5);
update public.profiles set balance = 100 where id = auth.uid();

\echo '--- 20 players buy 5 tickets each => sold out'
do $$ declare i int; d uuid; begin
  select id into d from public.draws limit 1;
  for i in 1..20 loop
    perform pg_temp.as_user(i);
    perform public.buy_tickets(d, 5);
  end loop;
end $$;
select status, sold_tickets, full_at is not null as has_full_at from public.draws;
select sum(balance) as balance_after, (select sum(-amount) from public.wallet_txns where kind='ticket') as spent from public.profiles;
select count(*) as tickets, count(distinct number) as distinct_numbers, min(number), max(number) from public.tickets;

\echo '--- buying after sold out must fail'
select pg_temp.as_user(1);
select public.buy_tickets(:'draw_id', 1);

\echo '--- direct tampering from the browser role must fail'
select pg_temp.as_user(1);
set role authenticated;
update public.profiles set balance = 999999 where id = auth.uid();
insert into public.tickets (draw_id, user_id, number) values (:'draw_id', auth.uid(), 101);
select count(*) as can_read_secrets from public.draw_secrets;
select count(*) as tickets_visible_to_user1 from public.tickets;
select count(*) as public_ticket_rows from public.draw_tickets_public;
reset role;

\echo '--- non-admin cannot draw; admin draws'
select pg_temp.as_user(1);
select public.draw_winner(:'draw_id', '');
select pg_temp.as_user(0);
select public.draw_winner(:'draw_id', 'drand-quicknet:123:abcdef') ->> 'winning_ticket' as winning_ticket;
select status, winner_ticket, winner_label, left(seed_revealed, 10) as seed_revealed from public.draws;
select public.draw_winner(:'draw_id', '');  -- must fail: already drawn

