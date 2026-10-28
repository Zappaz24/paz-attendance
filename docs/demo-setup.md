# Demo setup & runbook

## 0. Prerequisites

| Tool | Version | Check |
| --- | --- | --- |
| Node.js | 20+ (built on 24) | `node -v` |
| npm | 10+ | `npm -v` |
| Docker Desktop | current, running | `docker --version`, `docker info` |

Windows: Docker Desktop needs WSL 2 (`wsl --install`, reboot). This project was
built on a machine **without** Docker; the app code, schema, and build are
verified, but the live stack must be started on a machine with Docker.

## 1. First run

```bash
npm install
npx supabase start          # first run downloads images (several minutes)
npx supabase status         # copy the three values
```

Create `.env.local` from `.env.example` and paste:

| Env var | From `supabase status` | Used by |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | API URL (`http://127.0.0.1:54321`) | server + browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon key` | server + browser |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role key` | only `scripts/create-admin.mjs` |

```bash
npm run admin:create        # admin@school.test / admin12345
npm run dev                 # http://localhost:3000
```

Migrate + seed run automatically on the first `supabase start`. To re-apply them
later (this **deletes** all data):

```bash
npm run db:reset
```

Custom admin credentials:

```bash
npm run admin:create -- principal@school.test "S3cure-pass" "Mrs. Reyes"
```

## 2. Local endpoints

| Service | URL |
| --- | --- |
| App | <http://localhost:3000> |
| Supabase API | <http://127.0.0.1:54321> |
| Studio (tables, SQL, policies) | <http://127.0.0.1:54323> |
| Mailpit (auth emails) | <http://127.0.0.1:54324> |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

## 3. Demo script (5–6 minutes)

| Time | Step | What to say |
| --- | --- | --- |
| 0:00 | Sign in with the admin account | "Auth is Supabase; sign-up is disabled, accounts are provisioned by the school." |
| 0:30 | Dashboard | "12 students, 3 sections, nothing marked yet today." |
| 0:45 | Students → add one | "Two-layer validation: Zod on the server, CHECK/UNIQUE in Postgres." Try an 11-digit LRN first, then correct it. |
| 1:30 | Edit + search + section filter | "CRUD, plus a join between students and sections." |
| 2:15 | Attendance → Grade 7, today | Mark one **Present**, one **Late**, one **Absent**, then **Mark all present**. |
| 3:00 | Point at the Time-in column | "The timestamp is written by a database trigger, not the browser." Re-click a status → row updates, timestamp stays. |
| 3:45 | Reports → last 7 days | "Rate = present + late ÷ recorded days; unmarked days are excluded." |
| 4:15 | Studio → Table editor | Show `attendance_records` rows, the unique constraint, and the `time_in` values. |
| 4:45 | Studio → Authentication | Only the admin exists; sign-up disabled. |
| 5:15 | Code defense | Open `supabase/migrations/...init.sql` (RLS + trigger), then `actions/attendance.ts`, then `lib/queries.ts`. |

## 4. Backup plan (if Docker fails on demo day)

1. **Record a 3-minute screen capture** the day before: login → add student →
   mark attendance → report → Studio table.
2. Screenshot every screen at 1440px wide and keep them in `docs/screenshots/`.
3. Keep a printed ERD (`docs/erd.md`) and the acceptance checklist
   (`docs/spec.md` §5).
4. If the panel allows, run the app on a classmate's machine that has Docker.

**Before screenshotting:** crop or blur the `service_role` key, the JWT secret,
and anything in `.env.local`. Show `.env.example` instead.

## 6. Verify without Docker (what was run on the build machine)

The build machine had no Docker, so the schema was executed against an
in-process Postgres (PGlite) with a stand-in `auth` schema:

```bash
npm run verify:schema
```

It applies the real migration and seed and asserts: profile trigger, timestamp
stamping, absent-clears-time, duplicate-day rejection, LRN checks, enum values,
grade bounds, section-delete behaviour, and the summary view. Output is printed
as PASS/FAIL. This validates SQL semantics, not the Supabase Auth/PostgREST
stack — run the full demo on a Docker machine before the defense.

## 7. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Cannot connect to the Docker daemon` | Docker Desktop not running | Start Docker Desktop, wait for "Engine running" |
| `npx supabase start` hangs | Images still downloading | Wait; check `docker ps` |
| Port 54321/54322/54323 already in use | Another Supabase project running | `npx supabase stop --all` or change ports in `supabase/config.toml` |
| Login says "Invalid email or password" | Admin not created / wrong password | `npm run admin:create -- <email> <password>` |
| "Invalid API key" / 401 from PostgREST | Wrong anon key copied | Re-copy from `npx supabase status`, restart `npm run dev` |
| Dashboard is empty | Seed not applied | `npx supabase db reset` |
| `relation "public.students" does not exist` | Migration not applied | `npx supabase db reset` |
| Sign-up request rejected | Expected: `enable_signup = false` | Provision via `npm run admin:create` |
| `/setup` keeps showing | `.env.local` missing or dev server started before file existed | Create the file, restart `npm run dev` |
| Build works but production shows setup | `.env.local` absent at build time | Build with env present, or keep using `npm run dev` for the demo |

## 6. Shutdown / reset

```bash
npx supabase stop            # keeps data volume
npx supabase stop --no-backup  # discards local data
npm run db:reset             # re-apply schema + seed (data lost)
```
