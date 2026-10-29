# PAZ Attendance — handoff notes

Read this first after any reboot or after a long break. It is written so the
work can continue without the previous chat.

Last updated: 2026-10-29, at the reboot for the Docker/WSL2 install.
Repo: <https://github.com/Zappaz24/paz-attendance> · branch `main` · commit `bbfeac1`

---

## 1. What this project is

WS101 semi-final full-stack build: a **single-admin school attendance system**
for the PAZ defense. Grading source is the PDF
`Guidelines-WS101-Agentic-Full-Stack-Defense-1.pdf`.

Features that exist and work: admin sign-in, students CRUD (LRN + gender +
section), sections CRUD, daily attendance sheet (Present / Late / Absent /
Excused, mark-all, clear), database-stamped `time_in`, dashboard counts, and a
reports page with rates.

Stack: Next.js 16 (App Router) · React 19 · Tailwind 4 · Zod 4 · Supabase
(Postgres + Auth + RLS) · TypeScript.

---

## 2. Where the data lives (two modes)

| Mode | Env file | Status |
| --- | --- | --- |
| **Hosted Supabase** project `ndpqadsunplfbankdtsn` | `.env.local` | **working**, fully verified |
| **Local Docker stack** (`npx supabase start`) | `.env.local` after swap | being set up now |

Only one `.env.local` exists at a time. Before switching to local, copy the
current one to `.env.local.cloud.bak` (§5).

Hosted project URL: `https://ndpqadsunplfbankdtsn.supabase.co`
**Never append `/rest/v1/` to it.** (Doing so breaks every query — this mistake
already happened once.)

Admin login for both modes: **`admin@school.test` / `admin12345`**.
The real key values live in `.env.local` only — never paste them into a chat,
a commit, a screenshot, or a doc.

---

## 3. Verified state of the hosted project

Produced by API probes from this machine, not by assumption:

| Check | Result |
| --- | --- |
| `POST /auth/v1/signup` | HTTP 422 `signup_disabled` |
| Password login | 200, email confirmed, 1 email identity |
| `profiles` row | `School Admin` / `admin` |
| `students` as admin | 12 |
| `sections` as admin | 3 — Rizal/G7, Bonifacio/G8, Mabini/G9 |
| `students` as anon | 0 rows (RLS holding) |
| Insert `present` with no `time_in` | stamped by the DB trigger |
| Switch to `absent` | `time_in` → null |
| Switch back to `present` | re-stamped |
| Duplicate row, same student + day | HTTP 409 (unique constraint) |

The app itself was started and checked: `GET /login` → 200 containing "Admin
sign in", `GET /` → 307. Dashboard rendered **12 students / 3 sections /
0 present / 12 unmarked**.

---

## 4. What was installed just before the reboot

All of it required elevation; all of it succeeded.

| Thing | Result |
| --- | --- |
| WSL 2 optional feature | Enabled (DISM 3010 = success, restart pending) |
| VirtualMachinePlatform | Enabled |
| WSL runtime | 3.0.3, kernel 6.18.54, WSLg 1.0.79 |
| Docker Desktop | 4.97.0, `C:\Program Files\Docker\Docker\Docker Desktop.exe` |
| `docker-users` group | `User` is a member |
| Supabase CLI | 2.122.0, pinned as a devDependency (commit `bbfeac1`) |

Machine facts: Windows 11 IoT Enterprise **LTSC** build 26100, 16 cores, 32 GB
RAM, ~390 GB free, firmware virtualization on. **No winget and no Microsoft
Store** — that is why Docker came from the direct `.exe`, not a package manager.

Installer left at `%TEMP%\opencode\DockerDesktopInstaller.exe` (592 MB, safe to
delete once Docker runs).

---

## 5. Continue here — post-reboot checklist

Run these in order in PowerShell.

```powershell
# 0. If 'docker' or 'npm' is "not recognized", this window has a stale PATH.
#    Either open a NEW PowerShell window, or:
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')

# 1. Is the engine really up? (Docker Desktop must be running)
docker version
docker info --format '{{.OSType}} / {{.ServerVersion}}'
#    want: linux / 2x.x.x     if not, start "Docker Desktop" from the Start menu and wait for the whale to stop animating

# 2. Start the local stack. First run pulls ~1.5 GB of images.
cd C:\Users\User\Desktop\PAZ
npx supabase start
#    prints: API URL http://127.0.0.1:54321, Studio 54323, DB 54322, plus keys

# 3. Look at what it printed
npx supabase status

# 4. Keep the hosted config, then point the app at the local stack
Copy-Item .env.local .env.local.cloud.bak -Force
notepad .env.local
#    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from step 3>
#    SUPABASE_SERVICE_ROLE_KEY=<service_role key from step 3>

# 5. Provision the admin in the local DB (possible now that a service key exists)
npm run admin:create

# 6. Run it
npm run dev
#    http://localhost:3000  -> admin@school.test / admin12345
```

Steps 1–3 are where problems appear; see §8.

### What "good" looks like in step 2

`npx supabase start` ends with a box listing `API URL`, `GraphQL URL`,
`S3 Storage URL`, `DB URL`, `Studio URL` (`http://127.0.0.1:54323`),
`Inbucket URL` (`http://127.0.0.1:54324`), `JWT secret`, `anon key`,
`service_role key`, `S3 Access Key`. Twelve containers are named
`supabase_db_*`, `supabase_kong_*`, `supabase_auth_*`, `supabase_rest_*`,
`supabase_studio_*`, `supabase_inbucket_*`, `supabase_storage_*`,
`supabase_realtime_*`, `supabase_imgproxy_*`, `supabase_edge_runtime_*`,
`supabase_analytics_*`, `supabase_vector_*`.

`supabase db reset` **drops and rebuilds** the DB from
`supabase/migrations/20261028000000_init.sql` + `supabase/seed.sql`. Run it once
after the stack is healthy: that is the proof the migration is reproducible.

---

## 6. Commands worth remembering

```bash
npm run dev            # Next.js 16 on :3000
npm run build          # production build; session routes must stay dynamic (ƒ)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run verify:schema  # migration+seed in in-process Postgres, no Docker needed
npm run db:start       # npx supabase start
npm run db:reset       # npx supabase db reset  (DESTROYS local data)
npm run admin:create   # needs SUPABASE_SERVICE_ROLE_KEY in .env.local
```

Git needs the full path on this machine:
`& "C:\Program Files\Git\cmd\git.exe" status`

Stop the local stack: `npx supabase stop` (add `--no-backup` to discard data).
Free disk: `docker system df`, `docker system prune -a`.

---

## 7. Errors already hit and fixed (do not re-debug these)

| Error | Cause | Fix already applied |
| --- | --- | --- |
| `42601 syntax error at or near "<"` | chat markup (`<details>`) pasted into the SQL editor | paste raw SQL only |
| `42710 type "gender" already exists` | re-running the versioned migration | use `supabase/hosted-setup.sql` (idempotent) |
| `42501 must be owner of table users` | SQL editor can write `auth.users` but does not own it | never run DDL on `auth.users` |
| `500 Database error querying schema` on login | SQL-created user left token columns NULL; GoTrue scans them into Go strings | `supabase/fix-admin-login.sql` — **already applied** |
| `npm : not recognized` | terminal opened before Node was installed | new window, or refresh `$env:Path` (§5 step 0) |
| `400 Invalid login credentials` | user did not exist yet | create it (§5 step 5) |

---

## 8. Docker troubleshooting (if step 2 fails)

| Symptom | Do this |
| --- | --- |
| `docker: command not found` | PATH is stale → new window, or §5 step 0 |
| `Cannot connect to the Docker daemon` | Docker Desktop isn't running → start it, wait, retry |
| `WSL 2 installation is incomplete` | `wsl --update`, then `wsl --shutdown`, restart Docker Desktop |
| `Docker Desktop - WSL update failed` | `wsl --update --web-download` |
| engine stuck "starting" | `wsl --shutdown`, quit Docker Desktop from the tray, relaunch |
| `port is already allocated` | something else owns 54321–54324 → `npx supabase stop`, or find it with `Get-NetTCPConnection -LocalPort 54322` |
| installer refused on LTSC | fallback: Docker Engine inside a WSL2 Ubuntu distro, no Docker Desktop |

---

## 9. Still outstanding (deliverables)

- [ ] Local Docker stack running + `supabase db reset` succeeds (in progress)
- [ ] 7 screenshots into `docs/screenshots/`, **keys cropped** — list in
      `docs/demo-hosted.md` §3
- [ ] 3-minute recording — script with timings in `docs/demo-hosted.md` §4
- [ ] **T9 is still open: there are no automated tests.** Do not claim otherwise.
- [ ] Re-run the 10-step smoke test on whichever mode will be demoed

---

## 10. Which doc answers which question

| Doc | Contents |
| --- | --- |
| `docs/spec.md` | what the app must do |
| `docs/tickets.md` | ticket board incl. the open T9 |
| `docs/GLOSSARY.md` | domain language (student, section, attendance status…) |
| `docs/erd.md` | tables, keys, constraints |
| `docs/architecture.md` | layers, why queries live in `lib/queries.ts` |
| `docs/cloud-supabase.md` | hosted project runbook, key formats, the 3 common mistakes |
| `docs/codespace.md` | Codespaces path (Docker-in-Docker) |
| `docs/demo-hosted.md` | demo day: smoke test, screenshots, recording script |
| `docs/defense-qa.md` | 16 rehearsal questions with answers |
| `docs/review.md`, `docs/skills-evidence.md`, `docs/prompts.md` | process evidence |
| `docs/adr/0001-0003` | local Supabase · request-time rendering · single admin role |

---

## 11. Conventions that must not drift

- Server Components by default; `"use client"` only for forms/nav/confirm UI.
- Reads go through `lib/queries.ts`; pages never build Supabase queries.
- Writes live in `actions/*.ts`: `requireAdmin()` → Zod → DB → `revalidatePath`.
- `time_in` is database-stamped. Never accept it from a form.
- Field rules in `lib/validation.ts`; invariants also in SQL.
- Cache Components stay off (ADR 0002).
- If the schema changes: update `docs/erd.md`, the migration, then
  `npm run verify:schema`.
- Never commit `.env.local`, keys, or screenshots containing keys.

---

## 12. Resuming the conversation

Say **"im back"** and the next actions are §5 steps 1–3, in that order. If
something failed, paste the exact error text — the table in §7/§8 usually
identifies it without re-investigating.
