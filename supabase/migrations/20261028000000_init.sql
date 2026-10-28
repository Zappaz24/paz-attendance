-- PAZ Attendance — initial schema
-- Tables: profiles (admin users), sections, students, attendance_records
-- Security: RLS on every table, admin-only access via public.is_admin()

create extension if not exists pgcrypto;

-- ---------- enums -----------------------------------------------------------
create type public.gender as enum ('male', 'female');
create type public.attendance_status as enum ('present', 'late', 'absent', 'excused');

-- ---------- profiles --------------------------------------------------------
-- One row per Supabase Auth user. This build ships a single "admin" role.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null check (char_length(trim(full_name)) between 2 and 80),
  role       text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- ---------- sections --------------------------------------------------------
create table public.sections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 60),
  grade_level smallint not null check (grade_level between 7 and 12),
  adviser     text check (char_length(adviser) <= 80),
  created_at  timestamptz not null default now(),
  constraint sections_name_grade_unique unique (name, grade_level)
);

-- ---------- students --------------------------------------------------------
create table public.students (
  id         uuid primary key default gen_random_uuid(),
  lrn        char(12) not null unique check (lrn ~ '^[0-9]{12}$'),
  full_name  text not null check (char_length(trim(full_name)) between 2 and 80),
  gender     public.gender not null,
  section_id uuid references public.sections (id) on delete set null,
  created_at timestamptz not null default now()
);

create index students_section_idx on public.students (section_id);
create index students_name_idx on public.students (full_name);

-- ---------- attendance_records ---------------------------------------------
create table public.attendance_records (
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

create index attendance_date_idx on public.attendance_records (attendance_date);
create index attendance_student_idx on public.attendance_records (student_id);

-- ---------- triggers --------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger attendance_set_updated_at
before update on public.attendance_records
for each row execute function public.set_updated_at();

-- Stamps the check-in clock the first time a student is marked present/late.
-- Switching to absent/excused clears the clock.
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

create trigger attendance_stamp_time
before insert or update on public.attendance_records
for each row execute function public.stamp_attendance_time();

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

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- authorization helper -------------------------------------------
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

-- ---------- row level security ---------------------------------------------
alter table public.profiles enable row level security;
alter table public.sections enable row level security;
alter table public.students enable row level security;
alter table public.attendance_records enable row level security;

-- profiles: an admin can read their own profile (needed by the app shell).
create policy "admins read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

-- sections
create policy "admins manage sections"
on public.sections for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- students
create policy "admins manage students"
on public.students for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- attendance
create policy "admins manage attendance"
on public.attendance_records for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------- reporting view --------------------------------------------------
create view public.attendance_daily_summary
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
