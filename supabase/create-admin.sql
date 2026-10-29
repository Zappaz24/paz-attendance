-- PAZ Attendance — create the single admin account using SQL only
--
-- Use this when you have no secret key on disk and would rather not hunt
-- through the dashboard's Users UI. It writes exactly what the dashboard's
-- "Add user -> Create new user + Auto Confirm" writes:
--
--   auth.users        one confirmed user, password already bcrypt-hashed
--   auth.identities   the email identity for that user
--   public.profiles   role = 'admin' (via the on_auth_user_created trigger,
--                     plus an explicit upsert that repairs pre-existing rows)
--
-- Idempotent: running it twice resets the password instead of failing.
-- Run it in Dashboard -> SQL Editor -> + New query -> Run.

set search_path = extensions, public, auth;

create extension if not exists pgcrypto;

-- 1. the auth user itself (skipped if the email is already taken)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@school.test',
  crypt('admin12345', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"School Admin"}'::jsonb,
  now(),
  now()
where not exists (
  select 1 from auth.users where lower(email) = 'admin@school.test'
);

-- 2. if the user already existed, set the password and confirm the email
update auth.users
set encrypted_password = crypt('admin12345', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at         = now()
where lower(email) = 'admin@school.test';

-- 2b. GoTrue reads these columns into plain Go strings, so NULL makes every
--     auth request for this user fail with "Database error querying schema".
--     Columns are discovered at runtime so this works across schema versions.
do $$
declare
  col text;
begin
  for col in
    select column_name
    from information_schema.columns
    where table_schema = 'auth'
      and table_name   = 'users'
      and is_nullable  = 'YES'
      and data_type   in ('text', 'character varying')
      and (
        column_name like '%token%'
        or column_name in ('email_change', 'phone_change', 'email_otp')
      )
  loop
    execute format('update auth.users set %I = %L where %I is null', col, '', col);
  end loop;
end
$$;

-- 3. the email identity (GoTrue expects one per provider)
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true
  ),
  'email',
  u.email,
  now(),
  now(),
  now()
from auth.users u
where lower(u.email) = 'admin@school.test'
  and not exists (
    select 1 from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  );

-- 4. the profile row the app reads (role is what is_admin() checks)
insert into public.profiles (id, full_name, role)
select id, 'School Admin', 'admin'
from auth.users
where lower(email) = 'admin@school.test'
on conflict (id) do update
  set role      = 'admin',
      full_name = coalesce(nullif(public.profiles.full_name, ''), 'School Admin');

-- 5. prove it worked: expect one row, role = admin, confirmed = true
select
  u.email,
  p.full_name,
  p.role,
  u.email_confirmed_at is not null as confirmed
from auth.users u
join public.profiles p on p.id = u.id
order by u.email;
