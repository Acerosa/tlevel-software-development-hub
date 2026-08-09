begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

grant usage on schema extensions to anon, authenticated;

create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.requirements_payload(correct_count integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_agg(
    jsonb_build_object(
      'question_id', question.stable_key,
      'response_payload', to_jsonb(
        case when question.ordinal <= correct_count
          then 'synthetic-correct'
          else 'synthetic-review'
        end
      ),
      'awarded_score', case when question.ordinal <= correct_count then 1 else 0 end,
      'is_correct', question.ordinal <= correct_count
    )
    order by question.ordinal
  )
  from learning.questions as question
  where question.activity_version_id = '91000000-0000-4000-8000-000000000001'
$$;

create function tests.replace_question_id(
  payload jsonb,
  old_question_id text,
  new_question_id text
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_agg(
    case when item ->> 'question_id' = old_question_id
      then jsonb_set(item, '{question_id}', to_jsonb(new_question_id), false)
      else item
    end
  )
  from jsonb_array_elements(payload) as payload_item(item)
$$;

create function tests.replace_awarded_score(
  payload jsonb,
  target_question_id text,
  new_score numeric
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_agg(
    case when item ->> 'question_id' = target_question_id
      then jsonb_set(
        jsonb_set(item, '{awarded_score}', to_jsonb(new_score), false),
        '{is_correct}',
        to_jsonb(new_score > 0),
        false
      )
      else item
    end
  )
  from jsonb_array_elements(payload) as payload_item(item)
$$;

create function tests.attempt_id(target_client_attempt_id text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select attempt.id
  from learning.attempts as attempt
  where attempt.client_attempt_id = target_client_attempt_id
  limit 1
$$;

grant execute on function tests.requirements_payload(integer) to authenticated;
grant execute on function tests.replace_question_id(jsonb, text, text) to authenticated;
grant execute on function tests.replace_awarded_score(jsonb, text, numeric) to authenticated;
grant execute on function tests.attempt_id(text) to authenticated;

-- A test-only published version supplies a real cross-version question for rejection tests.
insert into learning.activities (
  id, module_id, stable_key, title, activity_type, git_path, active
) values (
  '93000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000001',
  'test-boundary-control',
  'Synthetic boundary control',
  'test-only',
  'supabase/tests/database/vertical_slice.test.sql',
  true
);

insert into learning.activity_versions (
  id, activity_id, version, content_hash, max_score, question_count
) values (
  '94000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000001',
  '1.0.0',
  'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  1,
  1
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
) values (
  '95000000-0000-4000-8000-000000000001',
  '94000000-0000-4000-8000-000000000001',
  'TEST-OTHER-001',
  'boundary',
  'Boundary',
  'single',
  'Boundary item',
  1,
  1
);

update learning.activity_versions
set published_at = clock_timestamp()
where id = '94000000-0000-4000-8000-000000000001';

select no_plan();

select is(
  (select count(*) from auth.users where raw_user_meta_data ->> 'synthetic' = 'true'),
  4::bigint,
  'four synthetic Supabase Auth users are present'
);

set local role anon;
select throws_like(
  $$select * from api.my_profile$$,
  '%permission denied%',
  'anonymous users cannot access private learner views'
);
reset role;

set local "request.jwt.claim.sub" = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
set local "request.jwt.claims" = '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffffff","role":"authenticated","studentId":"SYNTH-0001"}';
set local role authenticated;
select is(
  (select count(*) from api.my_profile),
  0::bigint,
  'a browser-local student ID claim does not grant access without an Auth mapping'
);
reset role;

set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from api.my_profile where student_number = 'SYNTH-0001'),
  1::bigint,
  'Student A Auth identity maps to exactly one student profile'
);

select is(
  (select count(*) from api.my_assignments
    where activity_key = 'foundations-requirements-classification'),
  1::bigint,
  'Student A can read the one activity assigned to Group A'
);

select lives_ok(
  $$
    select *
    from api.submit_attempt(
      'foundations-requirements-classification',
      '1.0.0',
      'student-a-attempt-1',
      tests.requirements_payload(15)
    )
  $$,
  'a valid Student A question-level submission succeeds'
);
reset role;

select is(
  (select student_id from learning.attempts
    where client_attempt_id = 'student-a-attempt-1'),
  '30000000-0000-4000-8000-000000000001'::uuid,
  'the server assigns Student A ownership from auth.uid()'
);

select is(
  (select enrolment_id from learning.attempts
    where client_attempt_id = 'student-a-attempt-1'),
  '70000000-0000-4000-8000-000000000001'::uuid,
  'the server assigns Student A active enrolment context'
);

select is(
  (select attempt_number from learning.attempts
    where client_attempt_id = 'student-a-attempt-1'),
  1,
  'the server assigns the first attempt number'
);

select is(
  (select count(*)
    from learning.responses as response
    join learning.attempts as attempt on attempt.id = response.attempt_id
    where attempt.client_attempt_id = 'student-a-attempt-1'),
  20::bigint,
  'all 20 valid question responses are stored'
);

select ok(
  (
    select score = 15
      and max_score = 20
      and marking_source = 'client'
      and evidence_level = 'question_level'
    from learning.attempts
    where client_attempt_id = 'student-a-attempt-1'
  ),
  'the attempt records bounded client marking and question-level evidence'
);

set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select is(
  (
    select idempotent
    from api.submit_attempt(
      'foundations-requirements-classification',
      '1.0.0',
      'student-a-attempt-1',
      tests.requirements_payload(15)
    )
  ),
  true,
  'an identical client_attempt_id retry returns the existing outcome'
);

select is(
  (select count(*) from api.my_attempts
    where client_attempt_id = 'student-a-attempt-1'),
  1::bigint,
  'an identical retry does not create another attempt'
);

select throws_ok(
  $$
    select *
    from api.submit_attempt(
      'foundations-requirements-classification',
      '1.0.0',
      'student-a-attempt-1',
      tests.requirements_payload(14)
    )
  $$,
  '23505',
  'CLIENT_ATTEMPT_ID_CONFLICT',
  'conflicting reuse of a learner-scoped client_attempt_id is rejected'
);

select throws_ok(
  $$
    select *
    from api.submit_attempt(
      'foundations-requirements-classification',
      '1.0.0',
      'student-a-invalid-score',
      tests.replace_awarded_score(
        tests.requirements_payload(15),
        'FOUND-REQ-001',
        2
      )
    )
  $$,
  '23514',
  'INVALID_RESPONSE_SCORE',
  'a client score above the question maximum is rejected'
);

select throws_ok(
  $$
    select *
    from api.submit_attempt(
      'foundations-requirements-classification',
      '1.0.0',
      'student-a-wrong-version-question',
      tests.replace_question_id(
        tests.requirements_payload(15),
        'FOUND-REQ-001',
        'TEST-OTHER-001'
      )
    )
  $$,
  '23514',
  'QUESTION_WRONG_ACTIVITY_VERSION',
  'a question from another published activity version is rejected'
);

select throws_ok(
  $$
    select *
    from api.submit_attempt(
      'foundations-requirements-classification',
      '1.0.0',
      'student-a-unknown-question',
      tests.replace_question_id(
        tests.requirements_payload(15),
        'FOUND-REQ-001',
        'UNKNOWN-QUESTION-001'
      )
    )
  $$,
  '22023',
  'UNKNOWN_QUESTION',
  'an unknown question ID is rejected'
);

select throws_ok(
  $$
    select *
    from api.submit_attempt(
      'foundations-requirements-classification',
      '9.9.9',
      'student-a-invalid-version',
      tests.requirements_payload(15)
    )
  $$,
  '22023',
  'INVALID_ACTIVITY_VERSION',
  'an invalid activity version is rejected'
);

select throws_like(
  $$
    insert into learning.attempts (
      client_attempt_id,
      student_id,
      enrolment_id,
      assignment_id,
      activity_version_id,
      attempt_number,
      score,
      max_score,
      marking_source,
      evidence_level,
      submission_hash
    ) values (
      'student-a-direct-write',
      '30000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '91000000-0000-4000-8000-000000000001',
      99,
      1,
      20,
      'client',
      'question_level',
      repeat('a', 64)
    )
  $$,
  '%permission denied%',
  'students cannot bypass the RPC with a direct attempt insert'
);
reset role;

set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000002';
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$
    select *
    from api.submit_attempt(
      'foundations-requirements-classification',
      '1.0.0',
      'student-b-attempt-1',
      tests.requirements_payload(10)
    )
  $$,
  'a valid Student B submission succeeds in Group B'
);

select is(
  (select count(*) from api.my_attempts),
  1::bigint,
  'Student B can read their own attempt'
);

select is(
  (select count(*) from api.my_attempts
    where client_attempt_id = 'student-a-attempt-1'),
  0::bigint,
  'Student B cannot read Student A attempts'
);

select is(
  (select count(*) from api.my_responses),
  20::bigint,
  'Student B reads only their own 20 responses'
);

select is(
  (select count(*) from api.my_responses
    where attempt_id = tests.attempt_id('student-a-attempt-1')),
  0::bigint,
  'Student B cannot read Student A responses'
);
reset role;

set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from api.my_attempts),
  1::bigint,
  'Student A can read their own first attempt'
);

select is(
  (select count(*) from api.my_attempts
    where client_attempt_id = 'student-b-attempt-1'),
  0::bigint,
  'Student A cannot read Student B attempts'
);

select lives_ok(
  $$
    select *
    from api.submit_attempt(
      'foundations-requirements-classification',
      '1.0.0',
      'student-a-attempt-2',
      tests.requirements_payload(18)
    )
  $$,
  'a genuinely new Student A attempt is appended'
);

select is(
  (select attempt_number from api.my_attempts
    where client_attempt_id = 'student-a-attempt-2'),
  2,
  'the server assigns attempt number two to the new attempt'
);

select is(
  (select count(*) from api.my_attempts),
  2::bigint,
  'Student A attempt history contains both append-only attempts'
);

select ok(
  (
    with ranked as (
      select
        100 * score / max_score as percentage,
        row_number() over (order by attempt_number) as first_rank,
        row_number() over (order by attempt_number desc) as latest_rank
      from api.my_attempts
    )
    select
      max(percentage) filter (where first_rank = 1) = 75
      and max(percentage) filter (where latest_rank = 1) = 90
      and max(percentage) = 90
    from ranked
  ),
  'first, latest and best percentages derive as 75, 90 and 90'
);

select throws_like(
  $$update learning.attempts set score = 0 where client_attempt_id = 'student-a-attempt-1'$$,
  '%permission denied%',
  'Student A cannot update a completed attempt directly'
);
reset role;

set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000001';
set local "request.jwt.claims" = '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from api.teacher_group_learners
    where group_code = 'TEST-GROUP-A' and student_number = 'SYNTH-0001'),
  1::bigint,
  'Teacher A can read Student A enrolment in authorised Group A'
);

select is(
  (select count(*) from api.teacher_group_learners
    where group_code = 'TEST-GROUP-B'),
  0::bigint,
  'Teacher A cannot read Group B enrolments'
);

select is(
  (select count(distinct student_number) from api.teacher_group_attempts),
  1::bigint,
  'Teacher A aggregate input contains Student A only'
);

select is(
  (select count(*) from api.teacher_group_attempts
    where student_number = 'SYNTH-0002'),
  0::bigint,
  'Teacher A cannot read Student B attempts'
);

select is(
  (select count(*) from api.teacher_group_responses),
  40::bigint,
  'Teacher A can read both Student A attempts at question level'
);

select is(
  (select average_percentage
    from api.teacher_group_topic_analytics
    where group_code = 'TEST-GROUP-A'
      and topic_key = 'requirements-classification'),
  100.00::numeric,
  'Teacher A classification-topic aggregate matches the fixture'
);

select is(
  (select average_percentage
    from api.teacher_group_topic_analytics
    where group_code = 'TEST-GROUP-A'
      and topic_key = 'requirement-testability'),
  41.67::numeric,
  'Teacher A testability-topic aggregate matches the fixture'
);

select is(
  (select success_rate
    from api.teacher_group_question_analytics
    where group_code = 'TEST-GROUP-A'
      and question_key = 'FOUND-REQ-001'),
  100.00::numeric,
  'Teacher A question success-rate calculation matches the fixture'
);
reset role;

set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000002';
set local "request.jwt.claims" = '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from api.teacher_group_attempts
    where group_code = 'TEST-GROUP-A'),
  0::bigint,
  'Teacher B cannot read Group A attempts or equivalent aggregate input'
);

select is(
  (select count(*) from api.teacher_group_topic_analytics
    where group_code = 'TEST-GROUP-A'),
  0::bigint,
  'Teacher B cannot obtain Group A topic analytics'
);

select is(
  (select count(distinct student_number) from api.teacher_group_attempts
    where group_code = 'TEST-GROUP-B'),
  1::bigint,
  'Teacher B can read Student B data in authorised Group B'
);
reset role;

select throws_ok(
  $$
    insert into learning.responses (
      attempt_id,
      question_id,
      response_payload,
      awarded_score,
      max_score,
      is_correct,
      marking_source
    ) values (
      (select id from learning.attempts where client_attempt_id = 'student-a-attempt-1'),
      '95000000-0000-4000-8000-000000000001',
      '"synthetic"'::jsonb,
      0,
      1,
      false,
      'client'
    )
  $$,
  '23514',
  'RESPONSE_QUESTION_VERSION_MISMATCH',
  'a response question must belong to the attempt activity version'
);

select throws_ok(
  $$
    insert into learning.responses (
      attempt_id,
      question_id,
      response_payload,
      awarded_score,
      max_score,
      is_correct,
      marking_source
    ) values (
      (select id from learning.attempts where client_attempt_id = 'student-a-attempt-1'),
      'a0000000-0000-4000-8000-000000000001',
      '"synthetic"'::jsonb,
      2,
      99,
      true,
      'client'
    )
  $$,
  '23514',
  'RESPONSE_SCORE_EXCEEDS_QUESTION_MAXIMUM',
  'database integrity rejects a response score above the question maximum'
);

select throws_ok(
  $$
    insert into learning.attempts (
      client_attempt_id,
      student_id,
      enrolment_id,
      assignment_id,
      activity_version_id,
      attempt_number,
      score,
      max_score,
      marking_source,
      evidence_level,
      submission_hash
    ) values (
      'integrity-over-activity-max',
      '30000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000001',
      '91000000-0000-4000-8000-000000000001',
      99,
      21,
      999,
      'client',
      'question_level',
      repeat('b', 64)
    )
  $$,
  '23514',
  'ATTEMPT_SCORE_EXCEEDS_ACTIVITY_MAXIMUM',
  'database integrity derives and enforces the activity maximum'
);

select throws_ok(
  $$update learning.attempts set score = 0 where client_attempt_id = 'student-a-attempt-1'$$,
  '55000',
  'COMPLETED_ATTEMPT_IMMUTABLE',
  'completed attempts cannot be overwritten even by a privileged direct update'
);

select throws_ok(
  $$
    update learning.responses
    set response_payload = '"changed"'::jsonb
    where attempt_id = (
      select id from learning.attempts where client_attempt_id = 'student-a-attempt-1'
    )
  $$,
  '55000',
  'COMPLETED_RESPONSE_IMMUTABLE',
  'responses belonging to completed attempts cannot be overwritten'
);

select throws_ok(
  $$
    update learning.activity_versions
    set content_hash = repeat('e', 64)
    where id = '91000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'PUBLISHED_ACTIVITY_VERSION_IMMUTABLE',
  'published activity versions are immutable'
);

select * from finish();
rollback;
