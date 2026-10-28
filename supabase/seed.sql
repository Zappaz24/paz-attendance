-- Demo data for local development (`supabase db reset` runs this file).
-- No attendance rows on purpose: attendance is created live during the demo.

insert into public.sections (id, name, grade_level, adviser) values
  ('11111111-1111-4111-8111-111111111111', 'Rizal',  7,  'Ms. Cruz'),
  ('22222222-2222-4222-8222-222222222222', 'Bonifacio', 8, 'Mr. Santos'),
  ('33333333-3333-4333-8333-333333333333', 'Mabini', 9,  'Ms. Reyes')
on conflict (id) do nothing;

insert into public.students (lrn, full_name, gender, section_id) values
  ('100000000001', 'Andrea Dela Cruz',   'female', '11111111-1111-4111-8111-111111111111'),
  ('100000000002', 'Miguel Ramos',       'male',   '11111111-1111-4111-8111-111111111111'),
  ('100000000003', 'Sofia Villanueva',   'female', '11111111-1111-4111-8111-111111111111'),
  ('100000000004', 'Joshua Mendoza',     'male',   '11111111-1111-4111-8111-111111111111'),
  ('100000000005', 'Bea Aquino',         'female', '22222222-2222-4222-8222-222222222222'),
  ('100000000006', 'Kyle Bautista',      'male',   '22222222-2222-4222-8222-222222222222'),
  ('100000000007', 'Trisha Navarro',     'female', '22222222-2222-4222-8222-222222222222'),
  ('100000000008', 'Paolo Garcia',       'male',   '22222222-2222-4222-8222-222222222222'),
  ('100000000009', 'Hannah Lim',         'female', '33333333-3333-4333-8333-333333333333'),
  ('100000000010', 'Rafael Torres',      'male',   '33333333-3333-4333-8333-333333333333'),
  ('100000000011', 'Camille Dizon',      'female', '33333333-3333-4333-8333-333333333333'),
  ('100000000012', 'Ethan Pascual',      'male',   '33333333-3333-4333-8333-333333333333')
on conflict (lrn) do nothing;
