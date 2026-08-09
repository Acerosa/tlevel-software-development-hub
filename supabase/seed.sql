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

insert into learning.courses (
  id, stable_key, code, title, qualification_level, active
) values (
  '50000000-0000-4000-8000-000000000001',
  't-level-digital-software-development',
  'TLEVEL-SD',
  'T Level Digital Software Development',
  'Level 3',
  true
);

insert into learning.groups (
  id, academic_year_id, course_id, code, name, active
) values
  (
    '60000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    'TEST-GROUP-A',
    'Synthetic Test Group A',
    true
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    'TEST-GROUP-B',
    'Synthetic Test Group B',
    true
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

insert into learning.modules (
  id, course_id, stable_key, title, sort_order, active
) values (
  '80000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  'software-development-foundations',
  'Software Development Foundations',
  1,
  true
);

insert into learning.topics (
  id, module_id, stable_key, title, sort_order, active
) values
  (
    '81000000-0000-4000-8000-000000000001',
    '80000000-0000-4000-8000-000000000001',
    'requirements-classification',
    'Requirements classification',
    1,
    true
  ),
  (
    '81000000-0000-4000-8000-000000000002',
    '80000000-0000-4000-8000-000000000001',
    'requirement-testability',
    'Requirement testability',
    2,
    true
  );

insert into learning.activities (
  id, module_id, stable_key, title, activity_type, git_path, active
) values (
  '90000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000001',
  'foundations-requirements-classification',
  'Requirements Classification',
  'classification',
  'js/data/foundations/requirements-classification.js',
  true
);

insert into learning.activity_versions (
  id,
  activity_id,
  version,
  content_hash,
  git_commit_sha,
  max_score,
  question_count,
  published_at
) values (
  '91000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000001',
  '1.0.0',
  '3e2f2a5efb06916ecafc204b6358d43df0d13d9e239c1896adde523f48a03755',
  'd927af061adeeea2394a396182f9a5b3290715b4',
  20,
  20,
  null
);

insert into learning.questions (
  id,
  activity_version_id,
  stable_key,
  section_key,
  section_title,
  question_type,
  analytics_title,
  ordinal,
  max_score
) values
  ('a0000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-001', 'classification', 'Classify the requirements', 'single', 'Classification item 01', 1, 1),
  ('a0000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-002', 'classification', 'Classify the requirements', 'single', 'Classification item 02', 2, 1),
  ('a0000000-0000-4000-8000-000000000003', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-003', 'classification', 'Classify the requirements', 'single', 'Classification item 03', 3, 1),
  ('a0000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-004', 'classification', 'Classify the requirements', 'single', 'Classification item 04', 4, 1),
  ('a0000000-0000-4000-8000-000000000005', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-005', 'classification', 'Classify the requirements', 'single', 'Classification item 05', 5, 1),
  ('a0000000-0000-4000-8000-000000000006', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-006', 'classification', 'Classify the requirements', 'single', 'Classification item 06', 6, 1),
  ('a0000000-0000-4000-8000-000000000007', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-007', 'classification', 'Classify the requirements', 'single', 'Classification item 07', 7, 1),
  ('a0000000-0000-4000-8000-000000000008', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-008', 'classification', 'Classify the requirements', 'single', 'Classification item 08', 8, 1),
  ('a0000000-0000-4000-8000-000000000009', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-009', 'classification', 'Classify the requirements', 'single', 'Classification item 09', 9, 1),
  ('a0000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-010', 'classification', 'Classify the requirements', 'single', 'Classification item 10', 10, 1),
  ('a0000000-0000-4000-8000-000000000011', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-011', 'classification', 'Classify the requirements', 'single', 'Classification item 11', 11, 1),
  ('a0000000-0000-4000-8000-000000000012', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-012', 'classification', 'Classify the requirements', 'single', 'Classification item 12', 12, 1),
  ('a0000000-0000-4000-8000-000000000013', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-013', 'classification', 'Classify the requirements', 'single', 'Classification item 13', 13, 1),
  ('a0000000-0000-4000-8000-000000000014', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-014', 'classification', 'Classify the requirements', 'single', 'Classification item 14', 14, 1),
  ('a0000000-0000-4000-8000-000000000015', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-TEST-001', 'testability', 'Requirement quality challenge', 'single', 'Testability item 01', 15, 1),
  ('a0000000-0000-4000-8000-000000000016', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-TEST-002', 'testability', 'Requirement quality challenge', 'single', 'Testability item 02', 16, 1),
  ('a0000000-0000-4000-8000-000000000017', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-TEST-003', 'testability', 'Requirement quality challenge', 'single', 'Testability item 03', 17, 1),
  ('a0000000-0000-4000-8000-000000000018', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-TEST-004', 'testability', 'Requirement quality challenge', 'single', 'Testability item 04', 18, 1),
  ('a0000000-0000-4000-8000-000000000019', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-TEST-005', 'testability', 'Requirement quality challenge', 'single', 'Testability item 05', 19, 1),
  ('a0000000-0000-4000-8000-000000000020', '91000000-0000-4000-8000-000000000001', 'FOUND-REQ-TEST-006', 'testability', 'Requirement quality challenge', 'single', 'Testability item 06', 20, 1);

insert into learning.question_topics (question_id, topic_id, weight)
select
  question.id,
  case
    when question.section_key = 'classification'
      then '81000000-0000-4000-8000-000000000001'::uuid
    else '81000000-0000-4000-8000-000000000002'::uuid
  end,
  1
from learning.questions as question
where question.activity_version_id = '91000000-0000-4000-8000-000000000001';

update learning.activity_versions
set published_at = '2026-08-09T00:00:00Z'
where id = '91000000-0000-4000-8000-000000000001'
  and published_at is null;

insert into learning.activity_assignments (
  id, group_id, activity_version_id, required, active
) values
  (
    '92000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    true,
    true
  ),
  (
    '92000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000002',
    '91000000-0000-4000-8000-000000000001',
    true,
    true
  );
