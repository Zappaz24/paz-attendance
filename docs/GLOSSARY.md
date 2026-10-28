# Glossary

Shared language for this project. Use these words in code, commits, slides, and
during the defense — one word per concept.

| Term | Meaning in this project |
| --- | --- |
| **Admin** | The only role in this build. A Supabase Auth user whose `profiles.role` is `admin`. Can manage students, sections, and attendance. |
| **Profile** | Row in `profiles`, 1:1 with `auth.users`. Holds display name + role. Created by an `auth.users` trigger. |
| **Section** | A class group (grade level 7–12 + name + adviser). Students belong to at most one section. |
| **Student** | A learner on the roster: 12-digit LRN, full name, gender, optional section. |
| **LRN** | Learner Reference Number. Exactly 12 digits, unique across the school. |
| **Attendance record** | One row per student per calendar day (`unique (student_id, attendance_date)`). |
| **Status** | `present`, `late`, `absent`, or `excused` (Postgres enum `attendance_status`). |
| **Time in** | `timestamptz` stamped by the `stamp_attendance_time` trigger the first time a student is marked present/late. Not user-supplied. |
| **Attendance sheet** | The `/attendance` screen: every student in the chosen section/date with their record (or none). |
| **Unmarked** | A student with no attendance record for the selected date. Not the same as absent. |
| **Attendance rate** | `(present + late) / recorded days × 100`. Days with no record are excluded. |
| **Recorded by** | `attendance_records.recorded_by`, FK to the admin profile that saved the entry. |
| **Session** | Supabase Auth cookie pair, refreshed by `proxy.ts` on every request. |
| **Optimistic redirect** | Proxy-level bounce to `/login`. Not authorization — `requireAdmin()` decides. |
| **RLS** | Row Level Security. Every table is locked down; policies use `public.is_admin()`. |
| **Seed data** | `supabase/seed.sql`: 3 sections + 12 students, no attendance rows. |
| **Flash** | Query-string message (`?flash=marked`) rendered by `<Flash />` after a redirect. |
| **Demo date** | The date selected on `/attendance`; defaults to today in `Asia/Manila`. |
