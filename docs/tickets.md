# Tickets

Tracer-bullet slices, each ending in something demonstrable. Written before
implementation, kept after it as the work log. `Blocked by` mirrors the order
they had to land in.

| ID | Ticket | Blocked by | Status | Evidence / files |
| --- | --- | --- | --- | --- |
| T1 | **Walking skeleton** — Next.js app boots, Tailwind shell, `/` redirects | — | Done | `app/layout.tsx`, `app/page.tsx`, `app/globals.css` |
| T2 | **Schema + seed** — enums, 4 tables, constraints, trigger, RLS, demo roster | T1 | Done | `supabase/migrations/20261028000000_init.sql`, `supabase/seed.sql` |
| T3 | **Auth vertical slice** — server client, proxy refresh, login action, guard, sign-out | T1, T2 | Done | `lib/supabase/server.ts`, `proxy.ts`, `actions/auth.ts`, `lib/auth.ts`, `app/login` |
| T4 | **App shell** — sidebar/mobile nav, admin identity, protected layout | T3 | Done | `app/(app)/layout.tsx`, `components/nav.tsx` |
| T5 | **Students CRUD** — create/list/search/filter/edit/delete + validation errors | T4 | Done | `actions/students.ts`, `lib/queries.ts`, `app/(app)/students`, `components/student-form.tsx` |
| T6 | **Sections CRUD** — create/delete, roster counts, safe delete | T4 | Done | `actions/sections.ts`, `app/(app)/sections`, `components/section-form.tsx` |
| T7 | **Attendance sheet** — date/section filter, per-student upsert, mark-all, clear, timestamps | T5, T6 | Done | `actions/attendance.ts`, `app/(app)/attendance`, `components/attendance-controls.tsx` |
| T8 | **Dashboard + reports** — today's totals, recent check-ins, rate report | T7 | Done | `app/(app)/dashboard`, `app/(app)/reports`, `lib/queries.ts` |
| T9 | **Automated tests** — unit tests for Zod schemas and rate maths; integration test for the unique-day upsert | T7 | **Not started** (schema invariants covered by `scripts/verify-schema.mjs`) | proposed: Vitest + Supabase local DB |
| T10 | **Defense package** — ERD, architecture, skills evidence, prompts, Q&A, demo script | T8 | Done | `docs/` |

## Notes

- **T9 is honestly open.** Do not claim a test suite in the defense. If there is
  time, start with `attendanceSchema` (future date, bad UUID) and the
  `unique (student_id, attendance_date)` conflict path.
- Each ticket was implemented as one vertical slice: schema → query → action →
  UI → verify, so no layer was "done" before the screen worked.
