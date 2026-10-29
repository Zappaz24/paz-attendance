# Hosted Supabase (no Docker)

Use this when Docker is unavailable — for example a school laptop or a Codespace
you don't want to spend hours on. It is the **same code**; only the three
environment values change. Everything else (RLS, triggers, Zod, Server Actions)
behaves identically.

> Trade-off for the defense: the PDF asks for evidence of Docker services. Keep
> `supabase/config.toml`, the migration and `docs/demo-setup.md` in the repo (they
> are), and say honestly that the runbook supports both — local stack for the
> Docker story, hosted project as the fallback.

---

## 0. The three mistakes almost everyone makes

| Wrong | Right | Why |
| --- | --- | --- |
| `https://<ref>.supabase.co/rest/v1/` | `https://<ref>.supabase.co` | supabase-js appends `/rest/v1` and `/auth/v1` itself. The extra suffix gives `/rest/v1/rest/v1/...` → **404 PGRST205**. |
| `SUPABASE_SERVICE_ROLE_KEY=sb_publishable_...` | `sb_secret_...` (or the legacy `service_role` JWT) | `sb_publishable_` is the **anon** key under the new naming. It cannot create users. |
| Assuming `enable_signup = false` applies | Turn sign-up off in the Dashboard | `supabase/config.toml` only configures the *local* stack. Hosted projects have their own toggle. |

## 1. Collect the values

Dashboard → **Project Settings → API Keys**

| `.env.local` variable | Where it comes from | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL / API URL — **strip `/rest/v1/`** | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Publishable** key, or the legacy **anon** JWT | no (shipped to browsers; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** key (`sb_secret_...`), or legacy **service_role** JWT | **YES** |

```bash
cp .env.example .env.local
# then edit the three lines
```

`.env.local` is gitignored. The service-role key bypasses RLS and must never be
committed, screenshotted, or printed.

## 2. Apply the schema

The hosted database starts empty — the app will 404 until this is done.

Dashboard → **SQL Editor → New query**

1. Paste the **whole** of `supabase/migrations/20261028000000_init.sql` → **Run**.
   Creates the enums, four tables, triggers, `is_admin()`, RLS policies and the
   summary view.
2. New query → paste `supabase/seed.sql` → **Run**. Adds 3 sections and 12
   students (no attendance rows — those are created live in the demo).

CLI alternative (needs the database password):

```bash
npx supabase link --project-ref <your-ref>
npx supabase db push          # migrations only
psql "$(npx supabase db url)" -f supabase/seed.sql   # optional seed
```

Verify from your machine:

```bash
curl "https://<ref>.supabase.co/rest/v1/students?select=id&limit=1" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
# [] with status 200 = table exists, RLS hides the rows from anon (correct)
# 404 PGRST205   = schema not applied (or PostgREST cache needs a reload)
```

## 3. Turn public sign-up off

Dashboard → **Authentication → Sign In / Providers** (wording varies by version):

- **"Allow new users to sign up"** → **OFF**
- Email provider may stay enabled — admins still sign in with email + password

Confirm with the API:

```bash
curl -s "https://<ref>.supabase.co/auth/v1/settings" -H "apikey: $ANON_KEY" | grep -o '"disable_signup":[a-z]*'
# want: "disable_signup":true
```

## 4. Create the admin

**Option A — script (needs the secret key in `.env.local`)**

```bash
npm run admin:create
# or with your own credentials
npm run admin:create -- principal@school.test "S3cure-pass-2026" "Mrs. Reyes"
```

**Option B — no secret key needed (dashboard)**

Dashboard → **Authentication → Users → Add user**:

- email `admin@school.test`
- password `admin12345`
- tick **Auto Confirm User**

The `on_auth_user_created` trigger inserts the `profiles` row with `role = admin`
automatically, so the account is immediately usable.

**Option C — Codespaces one command**

```bash
bash scripts/codespace-setup.sh --cloud
```

Validates `.env.local` (rejects the `/rest/v1/` mistake), then creates the admin
or explains what is missing.

## 5. Run and verify

```bash
npm run dev
```

Open the forwarded port 3000 URL, sign in, then run the 10-step smoke test in
`docs/codespace.md` §5. The dashboard must show **12 students / 3 sections**.

If you see "Could not load this screen" → schema not applied (step 2).
If login says "Invalid email or password" → no user (step 4) or wrong password.
If you land on `/login?error=not-admin` → the user exists but has no `profiles`
row; re-run step 4 option A, or insert the row in the SQL editor:

```sql
insert into public.profiles (id, full_name, role)
select id, 'School Admin', 'admin' from auth.users
where email = 'admin@school.test'
on conflict (id) do update set role = 'admin';
```

## 6. Security checklist for a hosted project

- [ ] `disable_signup` is `true` (verify with the curl above)
- [ ] RLS enabled on all four tables (`select * from pg_policies;` → 4 policies)
- [ ] Secret key exists only in `.env.local` / the host's env vars
- [ ] If a secret key was ever pasted into a chat, ticket, or screenshot →
      Dashboard → API Keys → **rotate** it
- [ ] Screenshots show `.env.example`, never the real values

## 7. Switching back to the local stack

```bash
npx supabase start
bash scripts/codespace-setup.sh        # rewrites .env.local with local keys
npm run dev
```

The previous `.env.local` is saved as `.env.local.bak`, so the hosted values are
not lost. Both modes share the same migration, so the schema cannot drift.

## 8. Defense answer

> "The app only knows three environment variables, so it runs against the local
> Docker stack or a hosted project without a code change. The schema, RLS and
> triggers are the same SQL in both. The Docker requirement is demonstrated with
> `supabase/config.toml` and the local runbook; the hosted project is what I use
> when Docker is not available."
