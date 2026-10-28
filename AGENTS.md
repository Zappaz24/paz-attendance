<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules — PAZ Attendance

Read `docs/GLOSSARY.md` and `docs/spec.md` before changing behaviour. The PDF
(`Guidelines-WS101-Agentic-Full-Stack-Defense-1.pdf`) is the grading source.

## Commands

```bash
npm run dev            # Next.js 16 on :3000
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run build          # production build (session routes must stay ƒ)
npm run verify:schema  # run migration+seed in in-process Postgres (no Docker)
npm run db:reset       # supabase db reset (needs Docker)
npm run admin:create   # provision admin (needs .env.local)
bash scripts/codespace-setup.sh  # Codespaces one-shot: deps + Supabase + env + admin
```

## Conventions

- Server Components by default; add `"use client"` only for forms/nav/confirm UI.
- Reads go through `lib/queries.ts`; pages never build Supabase queries.
- Writes live in `actions/*.ts`: `requireAdmin()` → Zod → DB → `revalidatePath`.
- Field rules belong in `lib/validation.ts`; invariants also belong in SQL.
- `time_in` is database-stamped. Never accept it from a form.
- HTTP filenames: Next 16 uses `proxy.ts` (not `middleware.ts`); docs in
  `node_modules/next/dist/docs/`.
- Cache Components are intentionally off (ADR 0002). Do not re-enable without
  reworking session reads.

## Honesty rules

- Do not claim tests exist (T9 is open) or that a skill wrote code.
- Do not commit `.env.local`, Supabase keys, or screenshots containing keys.
- If you change the schema, update `docs/erd.md` and the migration, then rerun
  `npm run verify:schema`.

