# ADR 0001 — Run Supabase locally in Docker

- Status: Accepted
- Date: 2026-10-28

## Context

The guidelines require Supabase as the database/backend **and** evidence of
Docker services. The defense happens on a school machine where internet access
may be unreliable. A hosted Supabase project would put keys and connectivity on
the critical path of the demo.

## Decision

Use the Supabase CLI local stack (`supabase start`) with committed
`supabase/config.toml`, migrations, and seed data. The Next.js dev server runs on
the host and reaches the stack at `127.0.0.1:54321`.

## Consequences

- Positive: works offline after images are pulled; no secrets in the repo; the
  schema is reproducible with `supabase db reset`; Studio is available for the
  walkthrough.
- Negative: Docker Desktop (and WSL 2 on Windows) is a hard prerequisite; first
  run is a multi-minute image download.
- Mitigation: `/setup` screen, `docs/demo-setup.md` troubleshooting, recorded
  demo fallback.

## Alternatives considered

- **Hosted Supabase**: simpler for the student, but requires internet, hides the
  Docker criterion, and risks exposing keys in screenshots.
- **Prisma + Postgres container**: satisfies Docker but not the explicit
  "Supabase integration" requirement.
