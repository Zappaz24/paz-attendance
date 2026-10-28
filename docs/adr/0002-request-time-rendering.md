# ADR 0002 — Disable Cache Components; keep reads request-scoped

- Status: Accepted
- Date: 2026-10-28

## Context

`create-next-app` for Next.js 16 enables `cacheComponents` and
`partialPrefetching` by default. With Cache Components on, any route that reads
cookies or the session must be modelled with explicit `"use cache"` boundaries
and Suspense, or it fails the build. Every screen in this app is admin-only and
must never be shared between sessions.

## Decision

Turn both flags off in `next.config.ts` and mark session-scoped routes
`dynamic = "force-dynamic"` (the `(app)` layout covers its children). Reads stay
in `lib/queries.ts`; mutations call `revalidatePath`.

## Consequences

- Positive: no chance of a cached dashboard leaking another admin's data; the
  mental model is simple enough to defend; fewer Suspense boundaries to explain.
- Positive: the build fails loudly if a route accidentally becomes static.
- Negative: no partial prerendering / static shell; every navigation hits the
  server. Acceptable for a class-sized app on localhost.
- Negative: if this grows into a public marketing + app hybrid, the public pages
  should opt back into caching individually.

## Alternatives considered

- **Keep Cache Components and wrap every dynamic read in Suspense**: more
  "modern", but the added complexity buys nothing for an authenticated CRUD app
  and creates a subtle data-leak risk if a boundary is missed.
