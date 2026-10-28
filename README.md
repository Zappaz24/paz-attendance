# PAZ Attendance

A full-stack school attendance console for **WS101 — Agentic Full-Stack Defense**.
Next.js (App Router) + Supabase (Postgres, Auth, RLS) running locally in Docker,
built with an agentic workflow and the Matt Pocock skills playbook.

Every attendance entry stores **who** (student, LRN, gender, section), **when**
(database-stamped `time_in`), and **what** (present / late / absent / excused).

---

## Features

| Area | What it does |
| --- | --- |
| Auth | Supabase email/password sign-in, single `admin` role, public sign-up disabled |
| Students | Create, list/search, edit, delete — name, 12-digit LRN, gender, section |
| Sections | Create/delete sections (grade 7–12) with adviser and live roster counts |
| Attendance | Per-day sheet, one click per student, "mark all present", timestamp stamped by a DB trigger |
| Reports | Date-range attendance rate per student, class average, perfect / below-80% counts |
| Security | RLS on every table, `is_admin()` policy helper, CHECK constraints, Zod validation on the server |
| UX | Server Components + Server Actions, optimistic proxy redirects, Tailwind UI, mobile nav |

## Stack

- **Next.js 16.4** (App Router, Turbopack, `proxy.ts`)
- **React 19** (`useActionState`, `useFormStatus`)
- **Supabase** local stack in Docker: Postgres 17, Auth (GoTrue), PostgREST, Studio
- **@supabase/ssr** for cookie-based sessions
- **Zod 4** for server-side validation
- **Tailwind CSS 4**

## Quick start

Prerequisites: Node 20+, Docker Desktop running.

```bash
# 1. install dependencies
npm install

# 2. start the local Supabase stack (first run downloads images)
npx supabase start

# 3. copy the keys printed by `supabase status`
npx supabase status
cp .env.example .env.local     # Windows: copy .env.example .env.local
#   NEXT_PUBLIC_SUPABASE_URL      -> API URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY -> anon key
#   SUPABASE_SERVICE_ROLE_KEY     -> service_role key (server-only)

# 4. create the admin account (admin@school.test / admin12345)
npm run admin:create

# 5. run the app
npm run dev
```

Open <http://localhost:3000>, sign in, and the seeded roster (3 sections,
12 students) is ready to mark.

Full walkthrough, screenshots checklist and troubleshooting: `docs/demo-setup.md`.

### Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next config, flat) |
| `npm run db:start` | `supabase start` |
| `npm run db:reset` | Re-apply migrations + seed (`supabase db reset`) |
| `npm run admin:create` | Create/reset the admin user via service role |
| `npm run verify:schema` | Run the real migration + seed in an in-process Postgres and assert triggers/constraints (no Docker needed) |

## Project structure

```
app/
  layout.tsx                 root shell, fonts, metadata
  page.tsx                   redirects to /dashboard or /setup
  setup/page.tsx             "finish local setup" screen (no env yet)
  login/page.tsx             admin sign-in (server component + client form)
  (app)/
    layout.tsx               protected shell: sidebar, user card, sign out
    dashboard/page.tsx       today's totals, breakdown bar, recent check-ins
    students/page.tsx        roster, search, section filter, add/delete
    students/[id]/edit/      edit form (dynamic route)
    sections/page.tsx        section cards + create/delete
    attendance/page.tsx      daily sheet, per-student status, timestamps
    reports/page.tsx         date-range attendance rates
actions/                     Server Actions (auth, students, sections, attendance)
components/                  client + server UI pieces
lib/
  supabase/server.ts         request-scoped client (cookies, RLS)
  supabase/client.ts         browser client (future realtime)
  auth.ts                    requireAdmin() guard, cached per request
  queries.ts                 typed read queries + shape mapping
  validation.ts              Zod schemas shared by every action
  format.ts                  Manila time zone helpers
  database.types.ts          hand-written schema types
supabase/
  config.toml                local stack config (signup disabled, ports)
  migrations/20261028000000_init.sql
  seed.sql                   demo sections + 12 students
proxy.ts                     session refresh + optimistic auth redirect
scripts/create-admin.mjs     service-role bootstrap for the admin user
docs/                        spec, ERD, architecture, skills evidence, defense Q&A
```

## Data model

`profiles` (1:1 with `auth.users`) → `attendance_records.recorded_by`
`sections` 1—N `students` 1—N `attendance_records`, with
`unique (student_id, attendance_date)`.

Full ERD, constraints and policies: `docs/erd.md`.

## Security model

1. **RLS on all four tables.** Policies call `public.is_admin()`, a
   `security definer` function that checks the caller's profile role.
2. **No public sign-up.** `enable_signup = false`; the only admin is created
   with the service role through `scripts/create-admin.mjs`.
3. **Service role never reaches the browser.** Only `NEXT_PUBLIC_*` values are
   inlined into the client bundle.
4. **Two-layer validation.** Zod in the Server Action; CHECK/UNIQUE constraints
   and enums in Postgres.
5. **Authoritative server guard.** The proxy redirect is optimistic only; every
   page and action calls `requireAdmin()`.
6. **Timestamps are server/database facts.** `time_in` is set by trigger, not
   accepted from the browser.

## Agentic workflow & skills evidence

This build followed the Matt Pocock skills loop: *grill → spec → tickets →
implement → review*, with the PDF requirements as the source of truth.

- `docs/skills-evidence.md` — which skill patterns were applied, what each
  produced, and how to reproduce them with the real installed skills.
- `docs/prompts.md` — the actual prompts from this session and the decisions
  they triggered.
- `docs/spec.md`, `docs/tickets.md`, `docs/GLOSSARY.md` — the artifacts.
- `docs/adr/` — three decisions with trade-offs (also useful for Q&A).

> Honesty note for the defense: the agent generated the initial code; the
> student must be able to open every file and explain it. `docs/defense-qa.md`
> lists the questions to rehearse.

## Demo (5 minutes)

1. Sign in → dashboard shows 12 students, 3 sections, 0 marked.
2. Students → add a student (validation: 11-digit LRN fails), edit, then search.
3. Attendance → pick a section, mark one **Present** (timestamp appears), one
   **Late**, one **Absent** → "mark all present" for the rest.
4. Reports → last 7 days, point at the rate column.
5. Supabase Studio (`http://127.0.0.1:54323`) → Table editor → show the rows and
   the `attendance_records` unique constraint; show `auth.users` has no sign-up.
6. Show `supabase/migrations/...init.sql` → RLS policies + trigger.

See `docs/demo-setup.md` for the backup plan if Docker misbehaves.
