# Demo day — hosted Supabase, no Docker

This is the runbook for the setup actually in use: Next.js on this machine,
Supabase **hosted** project `ndpqadsunplfbankdtsn`, admin account created in the
SQL editor. `docs/codespace.md` covers the Codespaces variant and
`docs/demo-setup.md` covers the local Docker stack; both use Supabase Studio on
`:54323`, which does not exist here.

Use the **Supabase dashboard** wherever those docs say "Studio".

## 0. Verified state

Checked against the live project, not assumed:

| Check | Result |
| --- | --- |
| `POST /auth/v1/signup` | HTTP 422 `signup_disabled` |
| Password login `admin@school.test` | 200, `email_confirmed_at` set, 1 email identity |
| `profiles` row for that user | `School Admin` / `admin` |
| `students` as admin | 12 |
| `sections` as admin | 3 (Rizal/G7, Bonifacio/G8, Mabini/G9) |
| `students` as anon | 0 rows (RLS) |
| Insert `present` without `time_in` | `time_in` stamped by the DB trigger |
| Switch to `absent` | `time_in` becomes `null` |
| Switch back to `present` | `time_in` re-stamped |
| Second row, same student, same day | HTTP 409 (unique constraint) |

## 1. Five minutes before you present

1. `.env.local` exists in the project root (never open it on screen).
2. `npm run dev` is running and printed `- Environments: .env.local`.
3. Sign in once, confirm the dashboard reads **12 / 3 / 0 / 12**.
4. Close every dashboard tab that shows API keys.
5. Keep the browser at `localhost:3000/login`, signed out, so the demo starts
   from the front door.

If `npm` is "not recognized", the terminal predates the Node install. Either
open a new PowerShell window, or run:

```powershell
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
npm run dev
```

## 2. Smoke test — the whole demo, once now and once before the defense

| # | Do this | Expect |
| --- | --- | --- |
| 1 | Sign in `admin@school.test` / `admin12345` | `/dashboard`: 12 students, 3 sections, 0 present, 12 unmarked |
| 2 | Students → add "Test Student" with LRN `123` | Field error, **no** row inserted |
| 3 | Fix the LRN to 12 digits → save | Row appears in the roster |
| 4 | Type part of the new name in search | Roster filters |
| 5 | Edit that student → change section → save | Section updates, flash message |
| 6 | Attendance → Grade 7 → **Present** on a student | **Time in** fills with a clock time |
| 7 | Click **Present** again on the same student | Timestamp does **not** change |
| 8 | Click **Absent** on that student | Timestamp clears, badge turns red |
| 9 | Reports → last 7 days | Rate bars and class average above 0% |
| 10 | Supabase dashboard → **Table Editor** → `attendance_records` | The rows you just made, `time_in` populated |

Then delete "Test Student" so the roster is back to 12 for the defense.

Hosted replacements for the local-only steps:

| Local Docker step | Hosted equivalent |
| --- | --- |
| Studio → Table Editor (`:54323`) | Dashboard → **Table Editor** |
| Studio → SQL editor | Dashboard → **SQL Editor** |
| `npx supabase db reset` | re-run `supabase/hosted-setup.sql` (idempotent) |
| `npx supabase status` | Dashboard → **Project Settings → API** |

## 3. Screenshots

`docs/screenshots/`, 1440px wide, full browser window, **crop the keys**.

1. `/dashboard` — today's four counts
2. `/students` — roster **and** the LRN validation error
3. `/attendance` — Present/Late/Absent buttons with the **Time in** column filled
4. `/reports` — rate bars and class average
5. Dashboard → Table Editor → `attendance_records` — `time_in` visible
6. Dashboard → SQL Editor running `select * from pg_policies;` — 4 policies
7. GitHub → `supabase/hosted-setup.sql` scrolled to the RLS section

Do not screenshot: the API Keys page, `.env.local`, the terminal if it echoed a
key, or anything showing `sb_secret_…` / `service_role`.

## 4. Three-minute recording

| Time | Show | Say |
| --- | --- | --- |
| 0:00–0:20 | repo tree / README | stack: Next.js 16 App Router, React 19, Tailwind 4, Zod 4, Supabase Postgres + Auth |
| 0:20–0:40 | `/login` → dashboard | "no sign-up page on purpose; one admin account, provisioned not registered" |
| 0:40–1:00 | dashboard numbers | 12 students, 3 sections, 0 present, 12 unmarked — all from the DB |
| 1:00–1:30 | Students: LRN `123` fails, fix it, search | "Zod on the server, `^[0-9]{12}$` also a CHECK constraint in SQL" |
| 1:30–2:15 | Attendance: Present → timestamp, Present again → unchanged, Absent → cleared | "the clock is stamped by a trigger, never sent by the browser" |
| 2:15–2:40 | Reports | rates computed from the same rows |
| 2:40–3:00 | Table Editor → `attendance_records`, then `pg_policies` | "RLS on every table; policies call `is_admin()`, which reads *your* profile row" |

Keep a local MP4 **and** an unlisted upload. The recording is the backup for a
dead network, a dead laptop, or a dead Supabase project.

## 5. If the network dies mid-demo

In order of preference:

1. Play the recording.
2. Show the screenshots.
3. Quote the verified table in §0 — those results were produced by API calls
   against the live project, so they are evidence, not claims.

Do not improvise a Docker start: there is no Docker on this machine. Say that
plainly and move to the recording.

## 6. If the panel asks "where is this deployed?"

> "The Next.js app runs on this laptop; the database and auth are a hosted
> Supabase project, so the data survives a restart and the schema is real
> Postgres, not a mock. I did not deploy the web tier publicly — a single-admin
> school system behind a login didn't need it, and I'd rather show the schema
> and policies than a Vercel URL that hides them. `docs/cloud-supabase.md` has
> the exact provisioning steps, and `scripts/codespace-setup.sh --cloud` runs
> them end to end."
