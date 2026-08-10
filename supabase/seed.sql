-- Local development fixtures only. All identities and records are synthetic.
-- This file is applied only by explicit local Supabase reset/seed commands.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'student.a@local.invalid',
    null,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"synthetic":true,"fixture":"student-a"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'student.b@local.invalid',
    null,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"synthetic":true,"fixture":"student-b"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'teacher.a@local.invalid',
    null,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"synthetic":true,"fixture":"teacher-a"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'teacher.b@local.invalid',
    null,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"synthetic":true,"fixture":"teacher-b"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values
  (
    '10000000-0000-4000-8000-000000000001',
    'student.a@local.invalid',
    '10000000-0000-4000-8000-000000000001',
    '{"sub":"10000000-0000-4000-8000-000000000001","email":"student.a@local.invalid","synthetic":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'student.b@local.invalid',
    '10000000-0000-4000-8000-000000000002',
    '{"sub":"10000000-0000-4000-8000-000000000002","email":"student.b@local.invalid","synthetic":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    'teacher.a@local.invalid',
    '20000000-0000-4000-8000-000000000001',
    '{"sub":"20000000-0000-4000-8000-000000000001","email":"teacher.a@local.invalid","synthetic":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'teacher.b@local.invalid',
    '20000000-0000-4000-8000-000000000002',
    '{"sub":"20000000-0000-4000-8000-000000000002","email":"teacher.b@local.invalid","synthetic":true}'::jsonb,
    'email',
    now(),
    now(),
    now()
  )
on conflict (provider_id, provider) do nothing;

insert into learning.academic_years (
  id, code, starts_on, ends_on, active
) values (
  '40000000-0000-4000-8000-000000000001',
  '2026-27',
  '2026-09-01',
  '2027-08-31',
  true
);

insert into learning.groups (
  id,
  academic_year_id,
  course_id,
  code,
  name,
  active,
  year_group,
  registration_key,
  registration_open
) values
  (
    '60000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    'TEST-GROUP-A',
    'Synthetic Test Group A',
    true,
    'Year 1',
    'synthetic-year-1-a',
    true
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    'TEST-GROUP-B',
    'Synthetic Test Group B',
    true,
    'Year 2',
    'synthetic-year-2-b',
    false
  );

insert into learning.students (
  id, auth_user_id, student_number, first_name, surname, display_name, active
) values
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'SYNTH-0001',
    'Synthetic',
    'Student A',
    'Synthetic Student A',
    true
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'SYNTH-0002',
    'Synthetic',
    'Student B',
    'Synthetic Student B',
    true
  );

insert into learning.teachers (
  id, auth_user_id, staff_reference, display_name, active
) values
  (
    '31000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'SYNTH-TEACHER-A',
    'Synthetic Teacher A',
    true
  ),
  (
    '31000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'SYNTH-TEACHER-B',
    'Synthetic Teacher B',
    true
  );

insert into learning.enrolments (
  id, student_id, group_id, joined_on, status
) values
  (
    '70000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '2026-09-01',
    'active'
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000002',
    '2026-09-01',
    'active'
  );

insert into learning.teacher_group_access (
  teacher_id, group_id, role, granted_at
) values
  (
    '31000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    'teacher',
    '2026-09-01T00:00:00Z'
  ),
  (
    '31000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000002',
    'teacher',
    '2026-09-01T00:00:00Z'
  );

insert into learning.activity_assignments (
  id, group_id, activity_version_id, required, active
)
select
  case
    when learner_group.id = '60000000-0000-4000-8000-000000000001'
      and activity_version.id = '91000000-0000-4000-8000-000000000001'
      then '92000000-0000-4000-8000-000000000001'::uuid
    when learner_group.id = '60000000-0000-4000-8000-000000000002'
      and activity_version.id = '91000000-0000-4000-8000-000000000001'
      then '92000000-0000-4000-8000-000000000002'::uuid
    else md5(learner_group.id::text || activity_version.id::text)::uuid
  end,
  learner_group.id,
  activity_version.id,
  true,
  true
from learning.groups as learner_group
cross join learning.activity_versions as activity_version
where learner_group.code in ('TEST-GROUP-A', 'TEST-GROUP-B')
  and activity_version.published_at is not null
  and activity_version.retired_at is null;

-- Local catalogue delivery rows for the imported Unit 3 activity metadata.
insert into learning.activity_delivery (
  activity_version_id,
  academic_year_id,
  curriculum_week_id,
  week_number,
  session_number,
  sort_order,
  active
)
select
  version.id,
  year.id,
  week.id,
  week.week_number,
  case
    when activity.stable_key like 'u3-w01-%' then 1
    else null
  end,
  row_number() over (partition by week.id order by activity.stable_key),
  true
from learning.activity_versions as version
join learning.activities as activity on activity.id = version.activity_id
join learning.modules as module on module.id = activity.module_id
join learning.courses as course on course.id = module.course_id
join learning.curriculum_weeks as week
  on week.module_id = module.id
  and (
    activity.stable_key like 'week' || week.week_number || '-%'
    or (week.week_number = 1 and activity.stable_key like 'u3-w01-%')
  )
join learning.academic_years as year on year.code = '2026-27' and year.active
where course.stable_key = 'ocr-level-3-it'
  and not exists (
    select 1 from learning.activity_delivery as existing
    where existing.activity_version_id = version.id
      and existing.academic_year_id = year.id
      and existing.group_id is null
  );
