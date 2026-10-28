# Defense Q&A rehearsal

Answers are short on purpose. Follow each with the file you would open.

## 1. Why Next.js App Router instead of Pages Router?

Server Components render the roster on the server, close to the data, and Server
Actions give form mutations a typed server boundary without hand-writing API
routes. The PDF explicitly requires App Router (`application routes, UI
components, server-side/data-handling logic`).
→ `app/(app)/attendance/page.tsx`, `actions/attendance.ts`

## 2. Where is authentication enforced?

Three places, by design:

1. `proxy.ts` refreshes the Supabase session and redirects signed-out visitors
   (optimistic only).
2. `requireAdmin()` is the authoritative check; every page and action calls it.
3. Postgres RLS denies rows even if someone bypasses the UI entirely.

→ `proxy.ts`, `lib/auth.ts`, `supabase/migrations/...init.sql`

## 3. Why does `is_admin()` need `security definer`?

The `profiles` policy only lets a user read their own row. Without
`security definer`, the policy's own lookup would be filtered by RLS and could
return false. The function runs as its owner (postgres), reads the role, and
returns a boolean. `set search_path = public` prevents schema hijacking.
→ `supabase/migrations/...init.sql`

## 4. Isn't shipping the anon key dangerous?

No. The anon key only identifies the project; authorization is RLS. With no
session, every table returns zero rows. The `service_role` key bypasses RLS and
is only used by a local script.
→ `supabase/config.toml`, `scripts/create-admin.mjs`

## 5. How do you guarantee the timestamp is real?

`time_in` is never accepted from the form. The `stamp_attendance_time` trigger
sets `now()` on insert (and when a previously absent student becomes present).
A CHECK constraint refuses present/late without `time_in`.
→ `supabase/migrations/...init.sql`, `actions/attendance.ts`

## 6. What happens if the teacher clicks "Present" twice?

The write is an upsert on `unique (student_id, attendance_date)`. The second
click updates the same row; the timestamp stays because the update omits
`time_in` and the trigger only stamps when it is null. No duplicates.
→ `actions/attendance.ts`, `lib/queries.ts`

## 7. Where is validation done?

Two layers:

- Server: Zod schemas (`lib/validation.ts`) run inside every Server Action.
- Database: enums, CHECK, UNIQUE, FKs — the real guarantee.

Client-side `required`/`pattern` attributes are convenience only.
→ `lib/validation.ts`, `supabase/migrations/...init.sql`

## 8. Why only one admin role?

Deliberate scope decision (recorded in ADR 0003). Multi-role would require
section ownership, narrower policies, and more UI. The data model already
supports adding a `teacher` role.
→ `docs/adr/0003-single-admin-role.md`

## 9. Walk me through marking a student present, end to end.

Form POST → `markAttendance` action → `requireAdmin()` → Zod → `upsert` with
`onConflict` → trigger stamps `time_in` → CHECK/RLS validate → `revalidatePath`
→ redirect with `?flash=marked` → server re-renders the sheet with the new row.
Three files: action, migration, page.

## 10. What happens on a duplicate LRN?

Postgres raises `23505`; the action maps it to a field error "That LRN is
already enrolled." The form shows it under the LRN input. No row is inserted.
→ `actions/students.ts`

## 11. Why is there no test suite?

It is honestly open (ticket T9). If asked to add one: unit-test the Zod schemas
and rate maths with Vitest, then an integration test against local Supabase that
posts the same student twice and asserts one row. Do not claim tests exist.
→ `docs/tickets.md` T9

## 12. What would break first at scale?

The attendance page loads the full roster for a date and filters in JS for
counts. At thousands of students per section this should move to the
`attendance_daily_summary` view / SQL aggregation and pagination. The view
already exists.
→ `docs/erd.md` (view), `lib/queries.ts`

## 13. What did the AI get wrong, and how did you fix it?

Concrete examples in `docs/review.md`:

- Session pages were prerendered as static because `.env.local` was absent at
  build time → added `force-dynamic` + `cache()`.
- The proxy could crash if Supabase was down → wrapped `getUser()` in try/catch.
- A "View roster" link had no filter behind it → added `sectionId` support.

Being able to name a bug and its fix is the point of this question.

## 14. Which Matt Pocock skill changed a decision?

`grilling` / `grill-with-docs` forced the four scope questions before code —
single admin, local Docker, basic scope. `to-tickets` forced the vertical-slice
order (auth before CRUD). `codebase-design` produced `lib/queries.ts` as the one
deep read module. Say what each produced; do not claim a skill wrote code.
→ `docs/skills-evidence.md`, `docs/prompts.md`

## 15. What is not implemented?

Teacher accounts, subjects/grading, parent access, notifications, file uploads,
automated tests, realtime updates. Say it before the panel finds it.

## 16. How would you deploy this for real?

Hosted Supabase project: run migrations, create the admin via the dashboard or
service role, set the three env vars in the host, keep `enable_signup = false`,
and remove `/setup`. The app needs no code change — only environment values.

---

## Grading map (100 pts)

| Criterion | Pts | Where the evidence lives |
| --- | --- | --- |
| Full-stack app & live demo | 25 | Dashboard, students, sections, attendance, reports; demo script |
| Next.js, Supabase & Docker architecture | 15 | `docs/architecture.md`, `proxy.ts`, `lib/supabase/*`, `supabase/config.toml` |
| Matt Pocock skills & artifacts | 20 | `.opencode/skills/`, `docs/skills-evidence.md`, `docs/prompts.md`, spec/tickets |
| Agentic workflow & decisions | 15 | `docs/prompts.md`, `docs/tickets.md`, `docs/review.md`, ADRs |
| Code walkthrough, defense & Q&A | 15 | This document + ability to open any file |
| Database, security & code quality | 10 | `docs/erd.md`, RLS, constraints, Zod, typecheck/lint/build |
