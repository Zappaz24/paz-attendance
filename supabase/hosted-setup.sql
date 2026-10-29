-- PAZ Attendance — idempotent hosted setup
--
-- Use this on a HOSTED Supabase project (Dashboard -> SQL Editor -> paste -> Run).
-- Unlike the versioned migration, every statement here is guarded, so it is safe
-- to run whether the database is empty, half-applied, or already complete.
-- Running it twice must not raise errors.
--
-- It creates: enums, 4 tables, indexes, triggers, is_admin(), RLS policies,
-- the attendance_daily_summary view, and the demo roster (3 sections, 12
-- students). Attendance rows are intentionally NOT seeded — they are created
-- live in the demo.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums -----
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'gender'
  ) then
    create type public.gender as enum ('male', 'female');
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'attendance_status'
  ) then
    create type public.attendance_status as enum ('present', 'late', 'absent', 'excused');
  end if;
end
$$;

-- --------------------------------------------------------------- tables -----
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null check (char_length(trim(full_name)) between 2 and 80),
  role       text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.sections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 60),
  grade_level smallint not null check (grade_level between 7 and 12),
  adviser     text check (char_length(adviser) <= 80),
  created_at  timestamptz not null default now(),
  constraint sections_name_grade_unique unique (name, grade_level)
);

create table if not exists public.students (
  id         uuid primary key default gen_random_uuid(),
  lrn        char(12) not null unique check (lrn ~ '^[0-9]{12}$'),
  full_name  text not null check (char_length(trim(full_name)) between 2 and 80),
  gender     public.gender not null,
  section_id uuid references public.sections (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students (id) on delete cascade,
  attendance_date date not null default current_date,
  status          public.attendance_status not null,
  time_in         timestamptz,
  note            text check (char_length(note) <= 200),
  recorded_by     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint attendance_one_per_day unique (student_id, attendance_date),
  constraint attendance_time_required check (
    (status in ('present', 'late') and time_in is not null)
    or status in ('absent', 'excused')
  )
);

create index if not exists students_section_idx on public.students (section_id);
create index if not exists students_name_idx on public.students (full_name);
create index if not exists attendance_date_idx on public.attendance_records (attendance_date);
create index if not exists attendance_student_idx on public.attendance_records (student_id);

-- ------------------------------------------------------------- functions ----
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Stamps the check-in clock the first time a student is present/late and clears
-- it when the status becomes absent/excused.
create or replace function public.stamp_attendance_time()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('present', 'late') and new.time_in is null then
    new.time_in := now();
  elsif new.status in ('absent', 'excused') then
    new.time_in := null;
  end if;
  return new;
end;
$$;

-- Every Supabase Auth user gets a profile row automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- The single authorization check used by every policy.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- -------------------------------------------------------------- triggers ----
drop trigger if exists attendance_set_updated_at on public.attendance_records;
create trigger attendance_set_updated_at
before update on public.attendance_records
for each row execute function public.set_updated_at();

drop trigger if exists attendance_stamp_time on public.attendance_records;
create trigger attendance_stamp_time
before insert or update on public.attendance_records
for each row execute function public.stamp_attendance_time();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------- RLS ----
alter table public.profiles enable row level security;
alter table public.sections enable row level security;
alter table public.students enable row level security;
alter table public.attendance_records enable row level security;

drop policy if exists "admins read own profile" on public.profiles;
create policy "admins read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "admins manage sections" on public.sections;
create policy "admins manage sections"
on public.sections for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins manage students" on public.students;
create policy "admins manage students"
on public.students for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins manage attendance" on public.attendance_records;
create policy "admins manage attendance"
on public.attendance_records for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------------ view ----
create or replace view public.attendance_daily_summary
with (security_invoker = true)
as
select
  a.attendance_date,
  s.section_id,
  count(*) filter (where a.status = 'present') as present_count,
  count(*) filter (where a.status = 'late')    as late_count,
  count(*) filter (where a.status = 'absent')  as absent_count,
  count(*) filter (where a.status = 'excused') as excused_count,
  count(*)                                      as total_count
from public.attendance_records a
join public.students s on s.id = a.student_id
group by a.attendance_date, s.section_id;

-- ------------------------------------------------------------------ seed ----
insert into public.sections (id, name, grade_level, adviser) values
  ('11111111-1111-4111-8111-111111111111', 'Rizal',     7, 'Ms. Cruz'),
  ('22222222-2222-4222-8222-222222222222', 'Bonifacio', 8, 'Mr. Santos'),
  ('33333333-3333-4333-8333-333333333333', 'Mabini',    9, 'Ms. Reyes')
on conflict (id) do nothing;

insert into public.students (lrn, full_name, gender, section_id) values
  ('100000000001', 'Andrea Dela Cruz', 'female', '11111111-1111-4111-8111-111111111111'),
  ('100000000002', 'Miguel Ramos',     'male',   '11111111-1111-4111-8111-111111111111'),
  ('100000000003', 'Sofia Villanueva', 'female', '11111111-1111-4111-8111-111111111111'),
  ('100000000004', 'Joshua Mendoza',   'male',   '11111111-1111-4111-8111-111111111111'),
  ('100000000005', 'Bea Aquino',       'female', '22222222-2222-4222-8222-222222222222'),
  ('100000000006', 'Kyle Bautista',    'male',   '22222222-2222-4222-8222-222222222222'),
  ('100000000007', 'Trisha Navarro',   'female', '22222222-2222-4222-8222-222222222222'),
  ('100000000008', 'Paolo Garcia',     'male',   '22222222-2222-4222-8222-222222222222'),
  ('100000000009', 'Hannah Lim',       'female', '33333333-3333-4333-8333-333333333333'),
  ('100000000010', 'Rafael Torres',    'male',   '33333333-3333-4333-8333-333333333333'),
  ('100000000011', 'Camille Dizon',    'female', '33333333-3333-4333-8333-333333333333'),
  ('100000000012', 'Ethan Pascual',    'male',   '33333333-3333-4333-8333-333333333333')
on conflict (lrn) do nothing;

-- Ask PostgREST to pick up the new tables immediately.
notify pgrst, 'reload schema';
