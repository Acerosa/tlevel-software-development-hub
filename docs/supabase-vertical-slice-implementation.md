# Local Supabase vertical slice implementation

**Status:** Implemented and fully validated against the local Supabase stack

**Supabase project linked to the repository:** `RR NHC Hub` (`hubwpkrqndorznwzvaer`)

**Remote changes made:** None

This note records the first development-only implementation arising from [the reviewed architecture proposal](supabase-architecture-proposal.md). The migrations, fixtures, RLS, views, RPC and tests have passed the complete local reset and automated test gates. They are not wired into the production website and have not been applied to the linked project.

## Selected activity

The slice uses **Requirements Classification**:

- stable activity ID: `foundations-requirements-classification`
- version: `1.0.0`
- sections: `classification` and `testability`
- questions: 20 real stable question IDs from the Git activity definition
- maximum score: 20, using the activity engine's default one point per question

This is the smallest representative non-coding activity. Its two sections and uniform single-choice questions keep the submission shape understandable while still proving version integrity, assignments, per-question evidence, repeat attempts, topic aggregation and RLS isolation.

Teaching prompts, choices, answers, feedback and browser marking remain in `js/data/foundations/requirements-classification.js`. The database seed contains only stable identity, section, score and analytics metadata.

## Files and migrations

| Migration | Responsibility |
|---|---|
| `20260809000100_create_learning_identity.sql` | `learning` and `api` schemas; academic, course, group, student, teacher, enrolment and teacher-access tables |
| `20260809000200_create_learning_curriculum.sql` | module/topic/activity/version/assignment/question catalogue; published-version immutability |
| `20260809000300_create_learning_records.sql` | append-only attempts, responses and cross-table integrity triggers |
| `20260809000400_create_learning_rls.sql` | RLS, least-privilege grants, Auth-identity helpers and actor-scoped read policies |
| `20260809000500_create_learning_api.sql` | narrow student/teacher views, analytics views and `api.submit_attempt` |

`supabase/config.toml` exposes the `api` schema locally. The `learning` base-table schema is deliberately not exposed through the Data API.

## Implemented tables

Identity and organisation:

- `academic_years`
- `courses`
- `groups`
- `students`
- `teachers`
- `enrolments`
- `teacher_group_access`

Curriculum and assignment:

- `modules`
- `topics`
- `activities`
- `activity_versions`
- `activity_assignments`
- `questions`
- `question_topics`

Learning records:

- `attempts`
- `responses`

There is no separate scores table. Attempt totals and question marks remain on their respective records.

## Omitted target architecture

The slice deliberately omits:

- skills and question-skill mappings, because the selected activity defines no reviewed skill tags;
- every coding language, submission, test-case and test-result table;
- Storage buckets and large artefacts;
- materialized analytics;
- the full audit subsystem;
- import/batch/provenance tables beyond the reserved attempt fields;
- real learner data and Google Sheets history;
- Edge Functions; and
- production Auth configuration or frontend integration.

## Synthetic fixtures

`supabase/seed.sql` contains only local synthetic data:

| Actor | Group | Access |
|---|---|---|
| Synthetic Student A (`SYNTH-0001`) | `TEST-GROUP-A` | own profile, enrolment, assignment, attempts and responses |
| Synthetic Student B (`SYNTH-0002`) | `TEST-GROUP-B` | own profile, enrolment, assignment, attempts and responses |
| Synthetic Teacher A | `TEST-GROUP-A` | Group A learner and analytics views only |
| Synthetic Teacher B | `TEST-GROUP-B` | Group B learner and analytics views only |

The four rows are linked to passwordless, synthetic local `auth.users`/`auth.identities` records. They have no reusable credentials. Tests set local JWT claims and execute as the real `anon` and `authenticated` PostgreSQL roles.

The curriculum fixture mirrors the real activity ID, version, two section IDs, 20 question IDs, one-point maxima, Git content hash and Git path. Two section-grounded topics are used:

- `requirements-classification`
- `requirement-testability`

This is intentionally not presented as a complete skill taxonomy.

## RLS actor matrix

| Actor | Permitted | Denied |
|---|---|---|
| Anonymous | No private `api` or `learning` access | profiles, enrolments, assignments, attempts, responses and analytics |
| Student | narrow own-profile/enrolment/assignment/attempt/response views; `api.submit_attempt` | other learners/groups, teacher analytics and direct record writes |
| Teacher | current authorised-group learners, attempts, responses, topic analytics and question analytics | equivalent data for groups without a current access row |
| Trusted migration/test owner | local fixture and schema administration | not a browser role and not part of the production frontend |

All 16 slice tables have RLS enabled. Reference/catalogue reads require authentication. Private rows are actor-scoped. There are no authenticated `INSERT`, `UPDATE` or `DELETE` grants on attempts or responses; writes go through the RPC. The `learning` schema remains outside the configured Data API schemas.

Base-table `SELECT` grants exist only to support `security_invoker` views and RLS. Student column grants omit surname and contact email. If `learning` were ever added to the exposed API schemas, that change would require a fresh permission review.

## Views and RPC

Student views:

- `api.my_profile`
- `api.my_enrolments`
- `api.my_assignments`
- `api.my_attempts`
- `api.my_responses`

Teacher views:

- `api.teacher_group_learners`
- `api.teacher_group_attempts`
- `api.teacher_group_responses`
- `api.teacher_group_topic_analytics`
- `api.teacher_group_question_analytics`

All views use `security_invoker = true`, so the caller's RLS policies remain active.

### `api.submit_attempt`

Inputs:

- `p_activity_key text`
- `p_activity_version text`
- `p_client_attempt_id text`
- `p_responses jsonb`

Each response object supplies the Git question ID, the selected response payload, the client-awarded score and the client correctness flag. The RPC accepts no student ID, enrolment ID, assignment ID, attempt number, total score, maximum score or timestamp.

The operation:

1. derives the caller with `auth.uid()`;
2. resolves one active student and one active enrolment;
3. verifies an active assignment for the published version;
4. validates a complete, unique set of questions against that version;
5. rejects unknown and cross-version questions;
6. derives question and activity maxima from the catalogue;
7. bounds every client-awarded mark and checks binary mark consistency;
8. serializes submissions per learner while assigning the next attempt number;
9. inserts the attempt and 20 responses in one transaction;
10. returns a narrow attempt summary.

Idempotency is `UNIQUE (student_id, client_attempt_id)`. A canonical submission hash permits identical retries and rejects conflicting reuse. This is a deliberate correction from the proposal's earlier globally unique example and follows the implementation brief.

Client marks are stored as `marking_source = 'client'` and `evidence_level = 'question_level'`. The database enforces bounds and consistency but does not claim to have independently marked the public-answer formative activity.

## Integrity and immutability

- Published activity versions, their questions and topic mappings reject mutation.
- Attempt context must link the same student, enrolment, group assignment and activity version.
- Attempt maximum is replaced with the published version maximum.
- A response question must belong to the attempt's activity version.
- Response maximum is replaced with the question maximum.
- Completed attempts and their responses reject direct update or deletion.
- Students receive no direct attempt/response mutation grants.

The one-active-enrolment-per-student constraint is intentionally strict for this slice. It must be reconsidered before supporting concurrent courses or multiple active teaching groups.

## Automated tests

`supabase/tests/database/vertical_slice.test.sql` is a transactional pgTAP suite covering:

- anonymous denial and Auth mapping;
- rejection of browser-local student-ID claims;
- student and teacher cross-group isolation;
- valid submissions and server-assigned ownership/context/attempt number;
- question storage and score bounds;
- invalid versions, unknown questions and cross-version questions;
- learner-scoped identical retry and conflicting reuse;
- append-only history and derivable first/latest/best values;
- teacher roster, topic and question analytics;
- response/version and score/max integrity; and
- immutable completed records and published versions.

`test/supabase-vertical-slice-static.test.js` provides non-database safeguards. It checks migration order, schema exposure, manifest fidelity, absence of invented skills, RPC ownership boundaries, scoped idempotency, RLS/write-grant intent, synthetic fixture hygiene and unchanged production integration.

## Commands and validation

Completed successfully:

```bash
node --test test/student-foundation.test.js test/site-integrity.test.js test/foundations-activities.test.js test/supabase-vertical-slice-static.test.js
```

Result: **50 passed, 0 failed**. This includes all 41 pre-existing tests and nine new static vertical-slice tests.

```bash
supabase start
supabase db reset --local
supabase test db
```

The local reset applied all five migrations and `supabase/seed.sql` without error. The pgTAP suite passed **48 tests with 0 failures**. It exercises the live local PostgreSQL/Auth schemas, RLS roles, RPC, response integrity, idempotency, isolation, derived attempt history and analytics. The Node suite was then rerun and remained at **50 passed, 0 failed**.

All commands used the local Docker stack. No linked database URL or remote fallback was used during validation.

## Security findings and limitations

1. The current production student-ID session remains identification, not authentication. It is intentionally excluded from this slice's authorisation path.
2. Client-awarded marks can still be forged within valid bounds. The evidence is explicitly labelled client-marked and formative.
3. The database validates a non-empty single-choice response shape but does not mirror the visible option list or independently verify option membership. That remains part of the explicitly client-marked evidence boundary.
4. Question response payloads become private learner data. Retention, staff access and export rules still require approval before any real-data pilot.
5. Teacher aggregates have no minimum cohort-size suppression in this synthetic slice.
6. The RPC requires all 20 questions in one completed submission; draft and partial attempts are not implemented.
7. Synthetic users are passwordless fixture identities. End-to-end Auth sign-in/recovery is not tested.
8. The one-active-enrolment rule is a vertical-slice simplification, not yet an approved production academic model.
9. No audit event is written for submission or teacher reads because the full audit subsystem was explicitly deferred.

## Proposal assumptions refined

- `client_attempt_id` is unique per student, not globally.
- An `activity_assignments` table is necessary even in the first slice to prove the authorised group/version context.
- Skills are not required until a reviewed taxonomy exists for the selected activity.
- One active enrolment is enforced for the slice so the RPC cannot silently choose among multiple contexts.
- Client correctness and marks are accepted only with explicit evidence labels and strict bounds; they are not authoritative server marking.
- Completed-response immutability is enforced alongside attempt immutability so privileged accidental edits cannot silently rewrite evidence.

## Recommended next milestone

The next milestone is a versioned, idempotent manifest/import process for the remaining reviewed Foundations activity metadata, followed by an Auth-backed synthetic remote verification gate before frontend cutover. The production student onboarding method still requires an explicit decision; the current student-ID flow must remain available until then and must not be silently converted into Supabase identity.

No changes were made to the remote RR NHC Hub Supabase database.
