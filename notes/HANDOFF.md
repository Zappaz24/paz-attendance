# PAZ Attendance — handoff notes

Read this first after any reboot or after a long break. It is written so the
work can continue without the previous chat.

Last updated: 2026-10-29, after the Docker install + local stack came up.
Repo: <https://github.com/Zappaz24/paz-attendance> · branch `main`

---

## 1. What this project is

WS101 semi-final full-stack build: a **single-admin school attendance system**
for the PAZ defense. Grading source is the PDF
`Guidelines-WS101-Agentic-Full-Stack-Defense-1.pdf`.

Working features: admin sign-in, students CRUD (LRN + gender + section),
sections CRUD, daily attendance sheet (Present / Late / Absent / Excused,
mark-all, clear), database-stamped `time_in`, dashboard counts, reports.

Stack: Next.js 16 (App Router) · React 19 · Tailwind 4 · Zod 4 · Supabase
(Postgres + Auth + RLS) · TypeScript · Docker (local Supabase).

---

## 2. Two data modes — both work

| Mode | Where the config lives | Status |
| --- | --- | --- |
| **Local Docker stack** — `npx supabase start` | `.env.local` (current) | **working, verified** |
| **Hosted** project `ndpqadsunplfbankdtsn` | `.env.local.cloud.bak` | **working, verified earlier** |

Switch to hosted: copy `.env.local.cloud.bak` over `.env.local` and restart the
dev server. Switch back to local: re-run `npx supabase status -o env` and rewrite
`.env.local` (URL `http://127.0.0.1:54321`, plus the anon + service_role keys).

**Never append `/rest/v1/` to either URL.** That mistake already cost an hour.

Admin login on both: **`admin@school.test` / `admin12345`**.
Key values live only in `.env.local` (gitignored). Do not paste them into chat,
commits, screenshots or docs.

---

## 3. Verified state — local stack

`npx supabase db reset` replayed `20261028000000_init.sql` from an **empty**
database, then `seed.sql`. Queried by exec'ing into the container:

| Check | Result |
| --- | --- |
| rows after migration + seed | `sections=3`, `students=12`, `attendance=0`, `profiles=0` |
| RLS policies | 4 — attendance/sections/students `ALL`, profiles `SELECT` |
| RLS enabled | all 4 tables `relrowsecurity = true` |
| our triggers | `attendance_set_updated_at`, `attendance_stamp_time`, `on_auth_user_created` |
| `set role anon; select count(*) from students` | **0** |
| `POST /auth/v1/signup` | 422 |
| password login | `admin@school.test`, confirmed |
| students as admin / as anon | 12 / 0 |
| `profiles` row | `School Admin` / `admin` |
| `GET /login` from the dev server | 200, contains "Admin sign in" |

## 3b. Verified state — hosted project

| Check | Result |
| --- | --- |
| signup | 422 `signup_disabled` |
| login | 200, confirmed, 1 email identity |
| students as admin / anon | 12 / 0 |
| insert `present` with no `time_in` | stamped by trigger |
| switch to `absent` / back to `present` | cleared / re-stamped |
| duplicate same-day row | HTTP 409 |

---

## 4. What is installed on this machine

| Thing | State |
| --- | --- |
| WSL 2 optional feature + VirtualMachinePlatform | Enabled |
| WSL runtime | 3.0.3, kernel 6.18.54, default distro `docker-desktop` |
| Docker Desktop | 4.97.0, engine 29.9.2, Linux containers |
| `docker-users` | `User` is a member |
| Supabase CLI | 2.122.0, devDependency (so `npm run db:*` work) |
| Postgres in the stack | 17.11 |

Machine: Windows 11 IoT Enterprise **LTSC** build 26100, 16 cores, 32 GB RAM.
**No winget, no Microsoft Store** — updates to Docker come from re-downloading
the `.exe`. Installer still at `%TEMP%\opencode\DockerDesktopInstaller.exe`
(592 MB, deletable now).

---

## 5. Daily commands

```powershell
cd C:\Users\User\Desktop\PAZ

npx supabase start     # or: npm run db:start   (Docker Desktop must be running)
npx supabase status    # URLs + keys
npm run dev            # http://localhost:3000
```

```bash
npm run build          # production build; session routes stay dynamic (ƒ)
npm run typecheck
npm run lint
npm run verify:schema  # migration+seed in in-process Postgres (no Docker)
npm run db:reset       # DESTROYS local data, replays migration + seed
npm run admin:create   # needs SUPABASE_SERVICE_ROLE_KEY in .env.local
```

Git needs the full path here: `& "C:\Program Files\Git\cmd\git.exe" status`.
If `npm`/`docker` is "not recognized", the window has a stale PATH — open a new
one, or
`$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`.

Useful Docker:
`docker ps` · `docker logs supabase_db_paz-attendance` ·
`docker exec -it supabase_db_paz-attendance psql -U postgres`
`npx supabase stop` · `npx supabase stop --no-backup` · `docker system df`

**After `db reset` or `stop --no-backup`, the admin user is gone** — run
`npm run admin:create` again. The seed only creates sections and students.

---

## 6. Ports

| Port | Thing |
| --- | --- |
| 3000 | Next.js dev server |
| 54321 | Supabase API gateway (Kong) — `/auth/v1`, `/rest/v1` |
| 54322 | Postgres |
| 54323 | **Studio** (the dashboard UI used for screenshots) |
| 54324 | Mailpit/Inbucket — fake mailbox |
| 54327 | analytics |

---

## 7. Errors already hit and fixed — do not re-debug

| Error | Cause | Fix |
| --- | --- | --- |
| `42601 syntax error at or near "<"` | chat markup pasted into SQL editor | paste raw SQL only |
| `42710 type "gender" already exists` | re-running the versioned migration | use `supabase/hosted-setup.sql` (idempotent) |
| `42501 must be owner of table users` | SQL editor can write `auth.users`, does not own it | never run DDL on `auth.users` |
| `500 Database error querying schema` on login | SQL-created user left token columns NULL | `supabase/fix-admin-login.sql` |
| `422 email_provider_disabled` on login | `[auth.email] enable_signup = false` in `config.toml` maps to *provider off*, not just signup off | keep it `true`; block signups with `[auth] enable_signup = false` |
| `npm : not recognized` | terminal predates the Node install | new window / refresh PATH |
| `supabase_vector` restart-looping | log shipper, harmless | ignore |

---

## 8. Docker troubleshooting

| Symptom | Do this |
| --- | --- |
| `Cannot connect to the Docker daemon` | Docker Desktop isn't running → start it, wait for the whale to settle |
| `WSL 2 installation is incomplete` | `wsl --update`, `wsl --shutdown`, restart Docker Desktop |
| engine stuck "starting" | `wsl --shutdown`, quit from tray, relaunch |
| `port is already allocated` | `npx supabase stop`; find the owner with `Get-NetTCPConnection -LocalPort 54322` |
| containers healthy but app 401/500 | `.env.local` points at the wrong stack — see §2 |

---

## 9. Still outstanding (deliverables)

- [x] Local Docker stack running
- [x] `supabase db reset` succeeds (reproducible migration)
- [ ] 7 screenshots into `docs/screenshots/`, **keys cropped** — list in
      `docs/demo-hosted.md` §3 (use Studio `:54323` for the table/policy ones)
- [ ] 3-minute recording — script with timings in `docs/demo-hosted.md` §4
- [ ] **T9 is still open: there are no automated tests.** Do not claim otherwise.
- [ ] Re-run the 10-step smoke test on the local stack before the defense

---

## 10. Which doc answers which question

| Doc | Contents |
| --- | --- |
| `docs/spec.md` | what the app must do |
| `docs/tickets.md` | ticket board incl. the open T9 |
| `docs/GLOSSARY.md` | domain language |
| `docs/erd.md` | tables, keys, constraints, RLS |
| `docs/architecture.md` | layers, request/mutation flows |
| `docs/demo-setup.md` | Docker install + local run |
| `docs/demo-hosted.md` | demo day: smoke test, screenshots, recording |
| `docs/cloud-supabase.md` | hosted project runbook |
| `docs/codespace.md` | Codespaces path |
| `docs/defense-qa.md` | 16 rehearsal questions |
| `docs/adr/0001-0003` | local Supabase · request-time rendering · single admin role |

---

## 11. Conventions that must not drift

- Server Components by default; `"use client"` only for forms/nav/confirm UI.
- Reads go through `lib/queries.ts`; pages never build Supabase queries.
- Writes live in `actions/*.ts`: `requireAdmin()` → Zod → DB → `revalidatePath`.
- `time_in` is database-stamped. Never accept it from a form.
- Field rules in `lib/validation.ts`; invariants also in SQL.
- Cache Components stay off (ADR 0002).
- Schema change → update `docs/erd.md`, the migration, then `npm run verify:schema`.
- Never commit `.env.local`, keys, or screenshots containing keys.
