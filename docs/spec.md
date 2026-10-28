# Spec — PAZ Attendance (WS101 semi-final project)

Status: implemented
Source of truth: `Guidelines-WS101-Agentic-Full-Stack-Defense-1.pdf` + the
4-question interview recorded in `docs/prompts.md`.

## 1. Problem

A school records daily attendance on paper. Names, genders, sections, and check-in
times are hard to query, impossible to audit, and lost when a sheet is misplaced.
The defense requires a demonstrable full-stack app with real database writes,
validation, security, and an explainable agentic workflow.

## 2. Users

- **Admin (only role).** A school staff member who signs in, maintains the
  roster and sections, marks attendance, and reads reports.
- No student/teacher/parent access in this build. No public sign-up.

## 3. Scope

### In scope

1. Email/password sign-in, session persisted in cookies, sign-out.
2. Students CRUD: name, 12-digit LRN, gender (`male`/`female`), section.
3. Sections CRUD: name, grade level 7–12, optional adviser.
4. Daily attendance: pick date (≤ today) and section, mark each student
   `present` / `late` / `absent` / `excused`, or clear the entry.
5. `time_in` timestamp stamped by the database on first present/late mark.
6. "Mark all present" for a date + section.
7. Dashboard: today's counts, breakdown, recent check-ins.
8. Reports: per-student rate for a date range, class average, perfect and
   below-80% counts.

### Out of scope (explicit non-goals)

- Multiple roles / teacher accounts (single admin was chosen for scope).
- Parent portal, SMS/email notifications, biometric/RFID hardware.
- Grading, subjects, timetable, payroll.
- File uploads (avatars, excuse letters) and offline sync.
- Automated test suite — planned as T9, not claimed as done.

## 4. Data rules

| Rule | Enforced in |
| --- | --- |
| LRN is exactly 12 digits and unique | Zod + `char(12)` CHECK + UNIQUE |
| Full name 2–80 chars | Zod + CHECK |
| Gender is `male`/`female` | Zod enum + Postgres enum |
| Grade level 7–12 | Zod + CHECK |
| Section name unique per grade level | UNIQUE `(name, grade_level)` |
| One attendance row per student per day | UNIQUE `(student_id, attendance_date)` |
| Present/late must have `time_in`; absent/excused must not | CHECK + trigger |
| Attendance cannot be dated in the future | Zod refine (UI also caps `max`) |
| Only admins may read/write anything | RLS + `is_admin()` + `requireAdmin()` |
| Deleting a student removes their attendance | FK `ON DELETE CASCADE` |
| Deleting a section keeps students | FK `ON DELETE SET NULL` |

## 5. Acceptance criteria

- [x] `npm run build`, `npm run typecheck`, `npm run lint` pass.
- [x] Signed-out visitor hitting `/dashboard` lands on `/login`.
- [x] Signed-in admin lands on `/dashboard` and sees live counts.
- [x] Adding a student with an 11-digit LRN shows a field error, no row inserted.
- [x] Duplicate LRN shows "That LRN is already enrolled."
- [x] Marking present inserts a row whose `time_in` is set by the trigger.
- [x] Re-marking the same student the same day updates the row (no duplicate).
- [x] Marking absent clears `time_in`.
- [x] Clearing an entry removes the row; student shows "Not marked".
- [x] Reports exclude days with no record from the rate.
- [x] Direct PostgREST calls without a session return no rows (RLS).

## 6. Risks / notes for the defense

- **Docker dependency.** If Docker is not running, the app cannot sign in; the
  `/setup` screen explains the fix and `docs/demo-setup.md` has a backup plan.
- **Service-role key.** Present only in `.env.local`; screenshots must show
  `.env.example`, never real keys (`supabase status` output must be cropped).
- **Scope honesty.** "Single admin" is a deliberate trade-off (ADR 0003), not a
  missing feature. Say so before the panel asks.
