# ADR 0003 — One admin role, enforced by RLS

- Status: Accepted
- Date: 2026-10-28

## Context

The student chose "Supabase Auth, single admin role" during the grilling round.
The PDF still grades database security and access controls, so authorization
cannot be skipped just because there is one role.

## Decision

Every authenticated user is an admin (role stored in `profiles.role`, default
`admin`). Authorization is enforced in three layers:

1. `proxy.ts` redirect (UX only),
2. `requireAdmin()` in every page/action (authoritative in the app),
3. RLS `is_admin()` policies in Postgres (authoritative in the data).

Public sign-up is disabled; admins are provisioned with a service-role script.

## Consequences

- Positive: one policy per table is easy to read and defend; the security story
  is real rather than "we trust the UI".
- Positive: adding a teacher role later is additive — add the enum value, a
  section-ownership column, and narrower policies; no schema rewrite.
- Negative: cannot demonstrate per-teacher scoping today.
- Negative: a compromised admin session has full data access (mitigated by
  Supabase session expiry/refresh; no custom MFA in this build).

## Alternatives considered

- **No auth**: fastest, but zero security points and no "access controls"
  deliverable.
- **admin + teacher roles now**: better realism, but doubles the UI and policy
  surface inside a "basic" scope request.
