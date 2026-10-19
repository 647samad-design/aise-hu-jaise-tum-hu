-- Pay-to-join: screenshot + sender name required, admin approval enters the player, participants count,
-- duplicate screenshot blocked, fallback to wallet when the draw sold out, settings, details, delivery.
-- Run on a fresh database after 00_stub + schema.
\set ON_ERROR_STOP off
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'j' || g || '@test.pk',
       jsonb_build_object('full_name', 'Player Number' || g, 'phone', '0300' || lpad(g::text, 7, '0'))
from generate_series(0, 4) g;
update public.profiles set is_admin = true where email = 'j0@test.pk';
create or replace function pg_temp.as_user(n int) returns void language sql as $$
  select set_config('request.jwt.claim.sub', ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0')), false)
$$;

select pg_temp.as_user(0);
select public.create_draw('Galaxy A15', 'New', '', 2, 5, 3, null, null) as d \gset

\echo '--- validation: no screenshot / no sender / wrong amount / folder of another user  (4 errors)'
select pg_temp.as_user(1);
select public.submit_topup(4, 'TRXA0001', 'easypaisa', 'Ali Raza', null, 's1', :'d', 2);
select public.submit_topup(4, 'TRXA0001', 'easypaisa', '', auth.uid()::text || '/1.jpg', 's1', :'d', 2);
select public.submit_topup(5, 'TRXA0001', 'easypaisa', 'Ali Raza', auth.uid()::text || '/1.jpg', 's1', :'d', 2);
select public.submit_topup(4, 'TRXA0001', 'easypaisa', 'Ali Raza', '00000000-0000-0000-0000-000000000002/1.jpg', 's1', :'d', 2);

\echo '--- valid requests; same screenshot again must fail'
select public.submit_topup(4, 'TRXA0001', 'easypaisa', 'Ali Raza', auth.uid()::text || '/1.jpg', 's1', :'d', 2) is not null as ok1;
select pg_temp.as_user(2);
select public.submit_topup(6, 'TRXB0001', 'jazzcash', 'Bilal Ahmed', auth.uid()::text || '/1.jpg', 's1', :'d', 3);
select public.submit_topup(6, 'TRXB0001', 'jazzcash', 'Bilal Ahmed', auth.uid()::text || '/1.jpg', 's2', :'d', 3) is not null as ok2;
select pg_temp.as_user(3);
select public.submit_topup(2, 'TRXC0001', 'easypaisa', 'Sana Malik', auth.uid()::text || '/1.jpg', 's3', :'d', 1) is not null as ok3;

\echo '--- admin approves 1 and 2: both entered, draw full; 3 falls back to wallet'
select pg_temp.as_user(0);
select (public.review_topup(id, true, null))->>'entered' as entered, result from public.topups where draw_id = :'d' order by id;
select id, result from public.topups order by id;
select status, sold_tickets, participants from public.draws where id = :'d';   -- full, 5, 2
select email, balance from public.profiles where email in ('j1@test.pk','j2@test.pk','j3@test.pk') order by email;  -- 0,0,2

\echo '--- public participants list (masked)'
select player, tickets from public.draw_participants_public where draw_id = :'d' order by tickets;
select public.public_stats();

\echo '--- settings + details + delivery; non-admin blocked'
select pg_temp.as_user(4);
select public.admin_set_setting('pay_qr_url', 'https://x/qr.png');
select pg_temp.as_user(0);
select public.admin_set_setting('pay_qr_url', 'https://x/qr.png');
select public.admin_set_setting('min_topup', 'abc');
select key, value from public.app_settings;
select public.update_draw_details(:'d', 'Other name', '', '', '{}', '{}', 0);      -- title locked
select public.update_draw_details(:'d', 'Galaxy A15', 'Brand new', 'https://x/1.jpg', array['https://x/2.jpg',' '], array['Brand: Samsung','', 'Storage: 128GB'], 45000);
select gallery, facts, prize_value from public.draws where id = :'d';
select public.set_delivery_proof(:'d', 'https://x/d.jpg', 'Handed over');      -- not drawn yet: error
select public.draw_winner(:'d', '') is not null as drawn;
select public.set_delivery_proof(:'d', 'https://x/d.jpg', 'Handed over in Karachi');
select delivered_at is not null as delivered, winner_label from public.draws where id = :'d';
