# Prompts & session record

This is the actual agent workflow for this build, edited only for formatting.
It doubles as the "prompts or session excerpts" deliverable.

## 1. Original request

> **User:** read pdf and do it and ask again, like attendance of school timestamp,
> name, gender, or anything, using mattpocock skills mcp etc. ask again

> **User:** read pdf inside the paz folder and do it and ask again, like
> attendance of school timestamp, name, gender, or anything, using mattpocock
> skills mcp etc. ask again

The PDF was `Guidelines-WS101-Agentic-Full-Stack-Defense-1.pdf` (WS101
semi-final project guidelines: Next.js + Supabase + Docker, Matt Pocock skills
evidence, live demo, ERD, code defense).

## 2. Grilling round (the "ask again" part)

Before code, the agent asked four decisions. Verbatim questions and the student's
answers:

| Question | Answer |
| --- | --- |
| How deep should the attendance app be? | "just the basic ones that include all possible needed instruction on the pdf to perform all required" → interpreted as: students + sections + attendance, enough for CRUD, ERD, RLS, Docker, reports |
| Which backend setup? | Local Supabase in Docker |
| Who logs in, with what roles? | Supabase Auth, single admin role |
| How to proceed? | Scaffold now + skill artifacts |

Consequences that came directly from those answers:

- One role → RLS policies are all `is_admin()`, no teacher/section ownership.
- Local Docker → `supabase/config.toml` is committed, no cloud keys anywhere.
- Basic scope → no subjects, grading, or timetable; reports stay to attendance rate.
- Skill artifacts → `docs/` is a first-class deliverable, not an afterthought.

## 3. Build log (condensed)

```text
Scaffold        npx create-next-app@latest (Next 16, TS, Tailwind, App Router)
Dependencies    npm i @supabase/supabase-js @supabase/ssr zod
Supabase        npx supabase init  → config.toml
Schema          supabase/migrations/20261028000000_init.sql
Seed            supabase/seed.sql (3 sections, 12 students, 0 attendance)
Data layer      lib/supabase/{env,server,client}.ts, lib/auth.ts, lib/queries.ts
Validation      lib/validation.ts (Zod schemas shared by all actions)
Mutations       actions/{auth,students,sections,attendance}.ts
UI              app/(app)/* screens + components
Proxy           proxy.ts (Next 16 renamed middleware → proxy)
Docs            specs, tickets, ERD, architecture, ADRs, this file, review
Verify          npm run typecheck / lint / build  (all pass)
```

## 4. Decisions the agent made and why

| Decision | Reason | Where recorded |
| --- | --- | --- |
| Local Supabase in Docker, not cloud | PDF names Supabase + Docker; works offline during the defense | ADR 0001 |
| Cache Components off | Every screen is session-scoped; avoided stale/shared caches | ADR 0002 |
| Single admin + RLS | Student chose single role; `is_admin()` keeps one policy per table | ADR 0003 |
| DB trigger stamps `time_in` | Timestamp must be a fact, not a browser value | `docs/erd.md` |
| Upsert on `(student_id, attendance_date)` | Makes re-clicking a status idempotent | `actions/attendance.ts` |
| Hand-written `Database` types | `npm run build` type-checks without a running database | `lib/database.types.ts` |
| `force-dynamic` on session pages | Prevents build-time prerender of admin-only screens | `app/(app)/layout.tsx` |
| `/setup` screen when env is missing | Demo fails gracefully with instructions instead of a 500 | `app/setup/page.tsx` |

## 5. Corrections made after self-review

See `docs/review.md`. Highlights:

- Pages were being prerendered as static when `.env.local` was absent →
  `export const dynamic = "force-dynamic"` + `cache()` on `requireAdmin()`.
- Proxy could throw when Supabase was down → wrapped `getUser()` in try/catch.
- Section "View roster" link had no filter behind it → added `sectionId` to
  `listStudents` and the students page filter.
- `.gitignore` ignored `.env.example` → added `!.env.example`.

## 6. What to say if asked "did the skill write this?"

No. The agent wrote the code. The skills supplied the *process and artefacts*:
the interview that fixed scope, the spec/ticket formats, the module boundary
(`lib/queries.ts`), the ADR habit, and the review checklist. `tdd` was not run
and is not claimed.
