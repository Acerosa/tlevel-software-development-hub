# Unit 3 Supabase backend contract

This is the backend contract for the OCR Level 3 IT Unit 3 Cyber Security frontend. The frontend uses the existing shared Supabase project and must not query the private `learning` schema directly.

## Catalogue identity

- Course stable key: `ocr-level-3-it`
- Module stable key: `unit-3-cyber-security`
- Curriculum hierarchy: course → module → curriculum week → activity → activity version → question.
- Unit 3 has seven curriculum weeks and 76 activities.
- Activity keys are stable database identifiers. The source `U3-W01-*` keys are stored lower-case in the database because the shared schema requires lower-case stable keys.
- Question keys are unique within an activity version. Repeated textual question IDs across different activities are valid.

## Learner authentication and security

The browser signs in through Supabase Auth. Database identity is derived from `auth.uid()`; the browser never supplies a student, teacher, group, assignment, score, or attempt number. The `learning` schema is private and is not an exposed Data API schema. RLS remains enabled on private tables.

## Browser-facing views

Use the `api` schema only:

- `api.my_profile` — current learner profile
- `api.my_enrolments` — current learner enrolments and course/module context
- `api.my_assignments` — learner-visible assigned activities
- `api.my_activity_delivery` — active activity week/session delivery metadata
- `api.curriculum_weeks` — active course/module weeks
- `api.my_attempts` — current learner attempt history
- `api.my_responses` — current learner response history
- `api.my_activity_progress` — derived learner activity progress

Teacher-only views are also available under `api.teacher_group_*` and are group-scoped by RLS/definer checks; they are not learner UI endpoints.

Question rows are stored privately. Do not expose raw `learning.questions` through the Data API until a separate review confirms the intended public content boundary; the current API contract does not expose answer keys or mark schemes.

## Submission RPC

Use `api.submit_attempt` for all supported activity submissions. Signature:

```text
api.submit_attempt(
  p_activity_key text,
  p_activity_version text,
  p_client_attempt_id text,
  p_responses jsonb,
  p_source_page text default null,
  p_started_at timestamptz default null,
  p_completed_at timestamptz default null,
  p_programming_language text default null
)
```

`p_responses` is heterogeneous JSON evidence. It can represent retrieval answers, single/multiple choice, matching/order structures, text/reflection evidence, and programming evidence. The RPC derives identity and totals server-side, validates activity/version/assignment eligibility, preserves idempotency by learner plus client attempt ID, and returns attempt ID, attempt number, score, maximum score, marking source, evidence level, received time, and idempotency status.

The frontend must not send `student_id`, `assignment_id`, `enrolment_id`, `attempt_number`, `max_score`, or a browser-calculated total.

## Progress and history

Read learner history through `api.my_attempts`, `api.my_responses`, and `api.my_activity_progress`. Do not aggregate private base tables in the browser. Topic/question analytics are teacher-facing API views, not learner endpoints.

## Unit 3 content status

The local catalogue contains 76 activities and 76 versions. The current local import contains 472 scored question rows from 484 extracted Week 2–7 question occurrences. Twelve source records have zero marks and are guidance/reflection/non-scored evidence; they are intentionally excluded from `learning.questions`, whose `max_score` must be positive. Week 1 remains represented by documented activity metadata but has no source data pack available for question import.

## Legacy behaviour

Apps Script and Google Sheets remain rollback-only. This document does not authorize frontend cutover, Apps Script deletion, production deployment, or schema changes. The next frontend task should consume this contract and the existing public Supabase configuration without editing migrations, RLS, views, or RPCs.
