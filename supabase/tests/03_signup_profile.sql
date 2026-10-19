-- Sign-up trigger: name + phone from the email/password form land in profiles.
\set ON_ERROR_STOP off
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000a001', 'good@test.pk', '{"full_name":"  Sana Malik ","phone":"0300-1234567"}'),
  ('00000000-0000-0000-0000-00000000a002', 'badphone@test.pk', '{"full_name":"Bilal","phone":"12345"}'),
  ('00000000-0000-0000-0000-00000000a003', 'google@test.pk', '{"name":"Google Person"}');

\echo '--- expect: Sana Malik / 03001234567 ; Bilal / null ; Google Person / null'
select email, full_name, phone from public.profiles where email in ('good@test.pk','badphone@test.pk','google@test.pk') order by email desc;

\echo '--- email change syncs to profile (expect new@test.pk)'
update auth.users set email = 'new@test.pk' where id = '00000000-0000-0000-0000-00000000a001';
select email from public.profiles where id = '00000000-0000-0000-0000-00000000a001';

\echo '--- users still cannot write profiles directly (expect permission denied)'
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a002', false);
update public.profiles set balance = 999999 where id = auth.uid();
reset role;
