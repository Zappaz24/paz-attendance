#!/usr/bin/env bash
#
# PAZ Attendance — one-shot setup for GitHub Codespaces / devcontainer.
#
#   bash scripts/codespace-setup.sh
#
# Does, in order:
#   1. verifies Docker + Node
#   2. installs npm dependencies (if missing)
#   3. starts the local Supabase stack (idempotent)
#   4. writes .env.local from `supabase status`
#   5. creates the admin account (admin@school.test / admin12345)
#
# Safe to re-run: an existing stack is reused and .env.local is backed up.
set -euo pipefail

step() { printf '\n==> %s\n' "$1"; }
note() { printf '    %s\n' "$1"; }
fail() { printf '\nERROR: %s\n' "$1" >&2; exit 1; }

cd "$(dirname "$0")/.."

# ---------------------------------------------------------------- 1. Docker --
step "Checking Docker"
docker info >/dev/null 2>&1 || fail "$(cat <<'MSG'
Docker daemon is not reachable.
  - Codespaces: Command Palette (F1) -> "Codespaces: Rebuild Container", then re-run this script.
  - Local: start Docker Desktop and wait for "Engine running".
MSG
)"
note "Docker $(docker version --format '{{.Server.Version}}')"

# ------------------------------------------------------------------ 2. Node --
step "Checking Node"
node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=9)?0:1)' \
  || fail "Node >= 22.9 is required (found $(node -v)). Run: nvm install 22 && nvm use 22"
note "Node $(node -v)"

# ------------------------------------------------------------ 3. Packages ---
step "Installing npm dependencies"
if [ -d node_modules ]; then
  note "node_modules already present — skipping (delete it to force a clean install)"
else
  npm ci
fi

# ------------------------------------------------------------- 4. Supabase ---
step "Starting Supabase (first run pulls ~10 images: 3-8 minutes)"
if npx supabase status >/dev/null 2>&1; then
  note "Supabase is already running — reusing it"
else
  npx supabase start
fi

# ------------------------------------------------------------ 5. .env.local --
step "Writing .env.local"
status_env="$(npx supabase status -o env)"

# Reads KEY="value" (or KEY=value) out of `supabase status -o env`.
get_value() {
  printf '%s\n' "$status_env" | sed -n "s/^$1=//p" | head -n 1 | tr -d '"'
}

api_url="$(get_value API_URL)"
anon_key="$(get_value ANON_KEY)"
service_key="$(get_value SERVICE_ROLE_KEY)"

# Newer Supabase CLI releases renamed the same secrets.
[ -n "$anon_key" ] || anon_key="$(get_value PUBLISHABLE_KEY)"
[ -n "$service_key" ] || service_key="$(get_value SECRET_KEY)"
[ -n "$api_url" ] || api_url="http://127.0.0.1:54321"

[ -n "$anon_key" ] || fail "Could not read the anon/publishable key. Run 'npx supabase status -o env' and write .env.local by hand."
[ -n "$service_key" ] || fail "Could not read the service_role/secret key. Run 'npx supabase status -o env' and write .env.local by hand."

if [ -f .env.local ]; then
  cp .env.local .env.local.bak
  note "Existing .env.local backed up to .env.local.bak"
fi

cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=$api_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key
SUPABASE_SERVICE_ROLE_KEY=$service_key
EOF
note "NEXT_PUBLIC_SUPABASE_URL=$api_url"
note "keys written (not printed — service_role key is a secret)"

# ---------------------------------------------------------------- 6. Admin --
step "Creating the admin account"
node --env-file=.env.local scripts/create-admin.mjs

# ---------------------------------------------------------------- 7. Done ----
cat <<'DONE'

------------------------------------------
Setup complete.

Start the app:
    npm run dev

Then open the forwarded port 3000 URL (Ports tab or the "Open in Browser" toast).
Do not use localhost:3000 in Codespaces.

Sign in:
    email:    admin@school.test
    password: admin12345

Security: right-click ports 54321 / 54322 / 54323 in the Ports tab and keep them
Private. Only port 3000 needs to be reachable by a browser.

Smoke test: dashboard shows 12 students / 3 sections -> Students -> add a student
with an 11-digit LRN (must fail) -> Attendance -> mark Present (timestamp appears)
-> Reports.
------------------------------------------
DONE
