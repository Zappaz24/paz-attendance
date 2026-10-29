-- PAZ Attendance — repair a hand-created admin so GoTrue can read it
--
-- Symptom this fixes: password login returns
--   HTTP 500 {"error_code":"unexpected_failure","msg":"Database error querying schema"}
--
-- Cause: GoTrue scans auth.users into Go structs with plain string fields. A
-- row inserted by SQL leaves the token columns (confirmation_token,
-- recovery_token, email_change_token_new, email_change, ...) as NULL, so the
-- scan fails and every auth request for that user 500s. The dashboard and the
-- Admin API always write '' there, which is why they never hit this.
--
-- Idempotent. Run in Dashboard -> SQL Editor -> + New query -> Run.

set search_path = extensions, public, auth;

-- 1. repair: any NULL token-ish text column becomes '' (columns are discovered
--    at runtime, so this works across Supabase schema versions)
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

-- Note: do NOT try to `alter table auth.users ... set default` — the SQL Editor
-- connects as `postgres`, which can write rows but does not own the table
-- (supabase_auth_admin does), so DDL there fails with
--   42501: must be owner of table users
-- Only the existing row needs repairing anyway.

-- 3. what is still NULL on the admin row (want: no rows, or only timestamps)
select key as still_null
from auth.users u, jsonb_each(to_jsonb(u))
where lower(u.email) = 'admin@school.test'
  and value = 'null'::jsonb
order by key;

-- 4. the row GoTrue will read
select
  u.email,
  u.aud,
  u.role,
  u.instance_id,
  left(u.encrypted_password, 7)                     as hash_prefix,
  u.email_confirmed_at is not null                  as confirmed,
  (select count(*) from auth.identities i
     where i.user_id = u.id and i.provider = 'email') as email_identities,
  u.raw_app_meta_data ->> 'provider'                as provider
from auth.users u
where lower(u.email) = 'admin@school.test';
