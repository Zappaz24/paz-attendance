# Running PAZ Attendance in GitHub Codespaces

The complete, do-this-in-order procedure. Written assuming you have never opened
a Codespace before. Nothing here needs Docker installed on your own machine.

---

## ⚠️ Read these six rules first

1. **Ports 54321, 54322 and 54323 stay Private.** They are the Supabase API,
   raw Postgres, and Studio. Public = anyone on the internet can talk to your
   database. Only port **3000** ever needs to be reachable by a browser.
2. **Never commit `.env.local`.** It holds the `service_role` key, which bypasses
   RLS. It is already gitignored — do not `git add -f` it.
3. **Crop `supabase status` output out of every screenshot.** It prints the
   service-role key and the JWT secret. Show `.env.example` in slides instead.
4. **Record a 3-minute backup video the day before the defense.** Codespaces
   needs internet. If the school Wi-Fi dies, the video is your demo.
5. **Stop the codespace when you are done.** Running it idle burns your free
   core-hours; a stopped one costs storage only.
6. **Do not claim tests exist.** Ticket T9 is open. `npm run verify:schema` is a
   schema check, not a test suite. Say so plainly.

---

## 1. Create the Codespace

1. Open <https://github.com/Zappaz24/paz-attendance>
2. **Code ▾ → Codespaces → Create codespace on main**
3. Machine type: **4-core / 8 GB** if available (free accounts default to
   2-core; Supabase runs ~10 containers, so 4-core is noticeably smoother).
4. Wait for VS Code in the browser (~1–2 min). The devcontainer builds itself and
   runs `npm ci` automatically.

The devcontainer already provides everything the project needs:

| Included by `.devcontainer/devcontainer.json` | Why |
| --- | --- |
| Node 22 | `scripts/*.mjs` use `--env-file` |
| Docker-in-Docker | `supabase start` needs a Docker daemon |
| GitHub CLI | handy for `gh repo view`, issues |
| Forwarded ports 3000, 54321–54324 | app + Supabase + Studio |

## 2. Run the setup (one command)

In the Codespace terminal (**Ctrl + `** if it is not visible):

```bash
bash scripts/codespace-setup.sh
```

It checks Docker and Node, installs dependencies, starts Supabase, writes
`.env.local` from `supabase status`, and creates the admin account. First run
takes **3–8 minutes** (image download). It is safe to re-run — an existing stack
is reused and `.env.local` is backed up to `.env.local.bak`.

Then:

```bash
npm run dev
```

## 3. Open the app

`next dev` prints `Local: http://localhost:3000`. **Do not click that.** In
Codespaces it resolves to the container, not your browser.

Use either:

- the toast **"Your application running on port 3000 is available" → Open in
  Browser**, or
- the **Ports** tab → right-click row `3000` → **Open in Browser**.

The URL looks like:

```
https://zappaz24-paz-attendance-<random>-3000.app.github.dev
```

Sign in: **admin@school.test / admin12345**

## 4. Lock down the ports

Open the **Ports** tab. For each row, right-click → **Port Visibility**:

| Port | Service | Visibility |
| --- | --- | --- |
| 3000 | Next.js app | **Private** (or Public only to share with your instructor) |
| 54321 | Supabase API | **Private** |
| 54322 | Postgres | **Private** |
| 54323 | Supabase Studio | **Private** |
| 54324 | Mailpit (unused) | **Private** |

Studio login, if asked: `supabase` / `supabase` (local stack default).

## 5. Smoke test — this is the whole demo, so rehearse it

Run it once now, once right before the defense. If all 9 pass, the app is whole.

| # | Do this | Expect |
| --- | --- | --- |
| 1 | Sign in as admin | `/dashboard`: **12 students, 3 sections, 0 marked** |
| 2 | Students → add "Test Student", LRN `123` | Field error, no row inserted |
| 3 | Correct the LRN to 12 digits → save | Row appears, appears in roster |
| 4 | Search the new name | Roster filters |
| 5 | Edit → change section → save | Section updates, flash message |
| 6 | Attendance → Grade 7 → **Present** | **Time in** column fills with a clock time |
| 7 | Click **Present** again on the same student | Row stays, timestamp does **not** change |
| 8 | Click **Absent** | Timestamp clears; status badge turns red |
| 9 | Reports → last 7 days | Rate bars + class average above 0% |
| 10 | Studio (:54323) → Table Editor → `attendance_records` | The rows you just created, `time_in` populated |

If step 1 shows 0 students: `npx supabase db reset` (re-applies the seed).

## 6. Capture your evidence (do this before the defense)

Screenshots at 1440px wide, saved to `docs/screenshots/` (**crop keys**):

1. `/dashboard` with today's counts
2. `/students` roster + the LRN validation error
3. `/attendance` with Present / Late / Absent and the **Time in** column
4. `/reports` with rate bars
5. Studio → `attendance_records` rows
6. Studio → `pg_policies` output (`select * from pg_policies;`)
7. `supabase/migrations/20261028000000_init.sql` scrolled to the RLS section

3-minute screen recording script:

> sign in → dashboard → add student (fail the LRN once) → attendance (present,
> late, absent, mark-all) → reports → Studio table → migration file → close.

Upload it unlisted to YouTube or keep a local MP4; have it on a USB stick too.

## 7. Coming back the next day

| Situation | What to do |
| --- | --- |
| Codespace stopped (idle timeout) | Open <https://github.com/codespaces>, click the codespace → it restarts. Data survives. |
| Terminal is empty | `npm run dev` again. Supabase may also have stopped: `npx supabase start` (fast now, images are cached). |
| `.env.local` gone | Re-run `bash scripts/codespace-setup.sh`. |
| Container rebuilt | Docker volumes are lost → run the setup script, then `npx supabase db reset` if the roster is empty. |
| Forgot the password | `npm run admin:create` resets it to `admin12345`. |

## 8. Reset or tear down

```bash
npx supabase db reset     # wipe data, re-run migration + seed (keeps the admin)
npx supabase stop         # stop containers, keep data
bash scripts/codespace-setup.sh   # rebuild env + admin afterwards
```

Delete the codespace entirely at <https://github.com/codespaces> when the subject
is finished (it auto-deletes 30 days after last use anyway).

## 9. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Docker daemon is not reachable` | Daemon not started in the container | F1 → **Codespaces: Rebuild Container**, re-run the script |
| Script stops at "Starting Supabase" with OOM | 2-core machine too small | Create/switch to 4-core, or `npx supabase start -x studio,imgproxy,storage-api,edge-runtime,logflare,vector,realtime` |
| `bad option: --env-file-if-exists` | Node < 22.9 | `nvm install 22 && nvm use 22`, then re-run |
| Port 3000 shows `404` / connection refused | `npm run dev` is not running | Start it; then reload the forwarded URL |
| Page keeps redirecting to `/setup` | `.env.local` missing or dev server started before it existed | Re-run the script, then `Ctrl-C` and `npm run dev` |
| Login says "Invalid email or password" | Admin user not created | `npm run admin:create` |
| Dashboard shows 0 students | Seed not applied | `npx supabase db reset` |
| `supabase start` "port already allocated" | Another project's stack is running | `npx supabase stop --all`, then start again |
| Studio asks for credentials | Local stack protects it | `supabase` / `supabase` |

## 10. Cost

Free personal accounts include **120 core-hours + 15 GB storage per month**.

| Machine | Hours you get per month |
| --- | --- |
| 2-core | ~60 |
| 4-core | ~30 |

A defense rehearsal costs well under an hour. Idle timeout is 30 minutes by
default — lower it at <https://github.com/settings/codespaces>.

## 11. If the panel asks "where is this deployed?"

> "Locally: Next.js on the host, Supabase in Docker containers. The same
> repo runs unchanged in GitHub Codespaces because the devcontainer ships
> Docker-in-Docker — the screenshots and video were captured there. For
> production it would be a hosted Supabase project plus a Node host; only the
> three environment variables change, no code."

That is the honest answer, and `docs/demo-setup.md` + this file are the receipts.
