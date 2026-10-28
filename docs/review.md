# Code review — two axes

Fixed point: the first working tree (no git history on this machine), so the
review covers all app code produced in this session.

## Axis 1 — Standards

| Check | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | Pass | Strict TS, no `any` in app code |
| `npm run lint` | Pass | Next flat config, no warnings |
| `npm run build` | Pass | All session routes dynamic (`ƒ`), `/setup` static |
| Type safety at DB boundary | Pass | Hand-written `Database` type + generated-shape rows |
| Server/client boundary | Pass | `"use client"` only on forms, nav, delete confirm, submit state |
| Secrets | Pass | Only `NEXT_PUBLIC_*` reach the client; service key used by a Node script |
| Dead code | Fixed | Removed unused `getClassRoster` |
| Error handling | Partial | Read errors throw → `app/(app)/error.tsx`; action errors return field state or redirect with `?error=` |
| Naming | Pass | Matches `docs/GLOSSARY.md`; DB snake_case, TS camelCase mapped at the edge |
| Accessibility | Partial | Labels, `aria-current`, `role="alert"`, focus ring; no full a11y audit |

## Axis 2 — Spec

| Acceptance criterion (`docs/spec.md` §5) | Verified by |
| --- | --- |
| Build / typecheck / lint pass | Commands re-run after final edits |
| Signed-out → `/login` | Proxy matcher + manual reading; integrate after Docker |
| Signed-in → `/dashboard` | `requireAdmin()` + login redirect |
| Invalid LRN rejected | Zod `^\d{12}$` + DB CHECK |
| Duplicate LRN message | `error.code === "23505"` branch |
| Present inserts trigger-stamped row | Trigger + CHECK; upsert omits `time_in` |
| Re-mark same day updates | `onConflict: "student_id,attendance_date"` |
| Absent clears timestamp | Trigger `elsif status in ('absent','excused')` |
| Clear entry → unmarked | `clearAttendance` delete + `?flash=cleared` |
| Report excludes unrecorded days | `rate` computed from `rows.length` only |
| Anon PostgREST returns nothing | RLS enabled, no `anon` policies |

Additionally, `npm run verify:schema` executed the real migration + seed in an
in-process Postgres and asserted 13 invariants (all PASS): profile trigger,
`time_in` stamping, absent clears clock, duplicate-day rejection, LRN format and
uniqueness, gender enum, grade bounds, section-delete → student unassigned, and
the summary view aggregation.

## Findings raised and resolved in this session

| # | Severity | Finding | Fix |
| --- | --- | --- | --- |
| 1 | High | Session pages prerendered as static when env absent at build (`○` routes), so a production build could serve a stale/empty dashboard | `export const dynamic = "force-dynamic"` on `(app)` layout, `/login`, `/` |
| 2 | Medium | Layout and page both called `getUser()` + profile query per request | `requireAdmin = cache(...)` shares one round trip |
| 3 | Medium | `proxy.ts` would throw if Supabase was unreachable, blocking `/setup` too | `try/catch` around `getUser()`; pages render their own error state |
| 4 | Medium | Section card "View roster" linked to `/students?section=` which the page ignored | Added `sectionId` to `listStudents` + filter UI |
| 5 | Low | `.gitignore` ignored `.env.example` | Added `!.env.example`, ignored `supabase/.temp` |
| 6 | Low | Dead `getClassRoster` helper | Removed |
| 7 | Low | Unused `attendanceStatusSchema` re-export in a `"use server"` module (invalid export shape) | Removed |

## Residual risks (say these out loud if asked)

1. **No automated tests** (T9). The unique-day upsert and Zod schemas are the
   highest-value first tests.
2. **Error text via query string** can echo Postgres messages (`?error=`). Fine
   locally; sanitise for production.
3. **`/setup` is public** and reveals local setup steps. Remove or gate it in a
   deployed build.
4. **Per-page roster loads** are fine for a class demo; see Q12 in
   `docs/defense-qa.md` for the scaling answer.
5. **Rate limit / lockout** relies on Supabase Auth defaults; no custom throttle.
