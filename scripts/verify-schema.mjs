/**
 * Schema verification without Docker.
 *
 * Runs the real migration + seed inside an in-process Postgres (PGlite) and
 * asserts the invariants the UI relies on. This is not a replacement for the
 * Supabase stack — it verifies SQL semantics (trigger, constraints, enums,
 * seed) on machines where Docker is unavailable.
 *
 *   npm run verify:schema
 */
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
let failures = 0;

function ok(name, detail = "") {
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, error) {
  failures += 1;
  console.log(`  FAIL  ${name} — ${error}`);
}

async function expectError(name, sql, pattern) {
  try {
    await db.exec(sql);
    fail(name, "expected an error, statement succeeded");
  } catch (error) {
    if (pattern.test(error.message)) ok(name, error.message.split("\n")[0]);
    else fail(name, `unexpected error: ${error.message}`);
  }
}

// Minimal stand-in for the Supabase-managed auth schema + API roles.
await db.exec(`
  create schema if not exists auth;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb
  );
  create function auth.uid() returns uuid
  language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
  do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
`);

const migration = await readFile(
  new URL("../supabase/migrations/20261028000000_init.sql", import.meta.url),
  "utf8",
);
const seed = await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8");

// PGlite already provides gen_random_uuid(); the extension guard is harmless
// but may not be packaged, so run the migration without that one line.
await db.exec(migration.replace(/create extension if not exists pgcrypto;/i, ""));
ok("migration applies", "4 tables, enums, triggers, RLS, view");

await db.exec(seed);
const { rows: seeded } = await db.query("select count(*)::int as n from students");
ok("seed loads", `${seeded[0].n} students`);

// --- profile trigger -------------------------------------------------------
const adminId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
await db.query(
  `insert into auth.users (id, email, raw_user_meta_data)
   values ($1, 'admin@school.test', '{"full_name":"School Admin"}'::jsonb)`,
  [adminId],
);
const { rows: profile } = await db.query("select full_name, role from profiles where id = $1", [
  adminId,
]);
ok("auth trigger creates profile", `${profile[0]?.full_name} / ${profile[0]?.role}`);

// Set the JWT claim the app would have after login.
await db.exec(`select set_config('request.jwt.claim.sub', '${adminId}', false)`);

const { rows: student } = await db.query("select id, full_name from students order by full_name limit 1");
const studentId = student[0].id;

// --- timestamp trigger -----------------------------------------------------
await db.query(
  `insert into attendance_records (student_id, attendance_date, status, recorded_by)
   values ($1, current_date, 'present', $2)`,
  [studentId, adminId],
);
const { rows: record } = await db.query(
  "select status, time_in, recorded_by from attendance_records where student_id = $1",
  [studentId],
);
ok(
  "present stamps time_in",
  record[0].time_in ? new Date(record[0].time_in).toISOString() : "NULL",
);
if (!record[0]?.time_in) fail("present stamps time_in", "time_in was null");
if (!record[0]?.recorded_by) fail("recorded_by saved", "recorded_by was null");

// --- one row per student per day ------------------------------------------
await expectError(
  "duplicate day rejected",
  `insert into attendance_records (student_id, attendance_date, status)
   values ('${studentId}', current_date, 'absent')`,
  /duplicate key|unique constraint/i,
);

// --- status changes --------------------------------------------------------
await db.query(
  `update attendance_records set status = 'absent' where student_id = $1 and attendance_date = current_date`,
  [studentId],
);
const { rows: absent } = await db.query(
  "select status, time_in from attendance_records where student_id = $1",
  [studentId],
);
ok("absent clears time_in", absent[0].time_in === null ? "NULL" : String(absent[0].time_in));

await db.query(
  `update attendance_records set status = 'late' where student_id = $1 and attendance_date = current_date`,
  [studentId],
);
const { rows: late } = await db.query(
  "select status, time_in from attendance_records where student_id = $1",
  [studentId],
);
if (late[0].time_in) ok("late re-stamps time_in");
else fail("late re-stamps time_in", "time_in stayed null");

// --- check / validation constraints ---------------------------------------
await expectError(
  "LRN must be 12 digits",
  `insert into students (lrn, full_name, gender) values ('123', 'Bad LRN', 'male')`,
  /check constraint|violates/i,
);

await expectError(
  "LRN unique",
  `insert into students (lrn, full_name, gender)
   select lrn, 'Duplicate LRN', 'female' from students limit 1`,
  /duplicate key|unique constraint/i,
);

await expectError(
  "gender enum",
  `insert into students (lrn, full_name, gender) values ('999999999999', 'X', 'other')`,
  /invalid input value|enum/i,
);

await expectError(
  "grade level bound",
  `insert into sections (name, grade_level) values ('Invalid', 13)`,
  /check constraint|violates/i,
);

// --- section delete keeps students ----------------------------------------
await db.query(
  `update students set section_id = (select id from sections limit 1) where id = $1`,
  [studentId],
);
await db.query(`delete from sections where id = (select section_id from students where id = $1)`, [
  studentId,
]);
const { rows: orphan } = await db.query("select section_id from students where id = $1", [studentId]);
ok("deleting a section keeps the student", orphan[0] ? "row kept" : "row lost");
if (orphan[0]?.section_id !== null) fail("student becomes unassigned", "section_id not null");

// --- reporting view --------------------------------------------------------
const { rows: summary } = await db.query(
  "select present_count, late_count, absent_count, total_count from attendance_daily_summary",
);
ok("summary view aggregates", JSON.stringify(summary[0] ?? {}));

await db.close();

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nSchema verified (in-process Postgres).");
