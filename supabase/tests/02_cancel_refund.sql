\set ON_ERROR_STOP off
create or replace function pg_temp.as_user(n int) returns void language sql as $$
  select set_config('request.jwt.claim.sub', ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0')), false)
$$;

-- Draw 2: 10 tickets, 3 players, then cancel and check refunds.
select pg_temp.as_user(0);
select public.create_draw('Power Bank', null, null, 5, 10, 0, null) as d2 \gset
select pg_temp.as_user(1); select public.buy_tickets(:'d2', 2);
select pg_temp.as_user(2); select public.buy_tickets(:'d2', 2);
select pg_temp.as_user(3); select public.buy_tickets(:'d2', 1);
select sum(balance) as total_before_cancel from public.profiles;           -- 1800 - 25 = 1775
select pg_temp.as_user(0);
select public.cancel_draw(:'d2') as players_refunded;
select sum(balance) as total_after_cancel from public.profiles;            -- back to 1800
select status, sold_tickets from public.draws where id = :'d2';
select count(*) as leftover_tickets from public.tickets where draw_id = :'d2';

-- Draw 3: 3 tickets, 2 left; two players race for the last 2 tickets at once (see race.sh)
select public.create_draw('Race Draw', null, null, 1, 3, 3, null) as d3 \gset
select pg_temp.as_user(4); select public.buy_tickets(:'d3', 1);
\echo :d3
