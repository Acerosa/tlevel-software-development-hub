# Supabase migration inventory (historical)

> This inventory is retained as migration history. Production schema and learner
> API ownership now live in `learning-platform-backend`; see
> [ARCHITECTURE.md](ARCHITECTURE.md).

## Purpose and inspected sources

This inventory records the migration boundary between the current static Hub,
the legacy Google Apps Script/Google Sheets backend, and Supabase. It was
completed before any remote migration or frontend cutover work.

The inspection covered:

- all five Foundations activity definitions and the shared catalogue, marking,
  state, submission and programming-language modules in this repository;
- the current student-ID session and Apps Script clients;
- all existing Supabase migrations, local fixtures, pgTAP tests and architecture
  notes;
- the complete Apps Script configuration, sheet setup, repositories, services,
  routing, progress, reporting, audit and validation code in
  `/Users/ricardorosa/Projects/tlevel-software-development-api`;
- the Apps Script API documentation, self-test coverage, local contract tests
  and mocked integration tests.

No Google Sheet contents were exported or inspected. The project owner has
confirmed that no real learners currently use the system, so there is no
production learner-data migration in scope.

## Current authoritative activity inventory

| Activity key | Version | Questions / max score | Grounded sections | Notes |
| --- | --- | ---: | --- | --- |
| `foundations-programming-diagnostic` | `2.0.0` | 35 / 35 | `variables`, `selection`, `iteration`, `functions`, `arrays-lists`, `debugging`, `basic-sql` | Selected languages are exactly `python`, `javascript`, and `csharp`; browser code is checked but never executed. |
| `foundations-requirements-classification` | `1.0.0` | 20 / 20 | `classification`, `testability` | First proven Supabase vertical slice. |
| `foundations-problem-decomposition` | `1.0.0` | 17 / 17 | `major-problems`, `hierarchy`, `quality`, `requirement-mapping` | Uses only shared non-coding interaction types. |
| `foundations-data-design` | `1.0.0` | 18 / 18 | `data-structure`, `data-types`, `keys-relationships`, `validation-dictionary` | Uses only shared non-coding interaction types. |
| `foundations-testing-methods` | `1.0.0` | 22 / 22 | `scenarios`, `purpose`, `test-cases`, `iteration` | Uses only shared non-coding interaction types. |

The Git definitions remain authoritative for prompts, visible options, answers,
feedback, examples, editor starter content and marking rules. Stable activity,
section and question identifiers are mirrored into PostgreSQL for validation and
analytics.

## KEEP / MIGRATE

### Identity and organisation

- Preserve student numbers as `text`, including leading zeroes.
- Preserve the application-owned student profile separately from Supabase Auth.
  `learning.students.auth_user_id` links to `auth.users.id`; the browser never
  supplies a student number as an ownership claim.
- Keep `students`, `groups`, `enrolments`, `teachers`, and explicit teacher/group
  access as relational records.
- Keep historical enrolment and assignment context on each attempt so later
  group changes do not rewrite learning history.
- Keep active/inactive lifecycle state and use deactivation/retirement rather
  than casual deletion of referenced records.
- Keep course identity and qualification level where grounded by source:
  `t-level-digital-software-development`, T Level Digital Software Development,
  Level 3. Do not invent a course code, unit code, academic year, or real group.

### Curriculum reference data

- Stable activity IDs, titles, versions, activity types, Git paths, maximum
  scores, question counts, active state and meaningful ordering.
- Stable section and question IDs, section titles, interaction types, ordinal
  positions and per-question maximum scores.
- Section-grounded topics. A section key may be used as the initial topic key
  because it is reviewed source data; no external or invented taxonomy is
  introduced.
- Supported Programming Diagnostic languages: Python, JavaScript and C#.
- Immutable published activity versions identified by semantic version and a
  deterministic content hash.
- Assignments as operational group/version relationships. Assignments are not
  copied from Git and are created only for real configured groups or synthetic
  verification groups.

### Learning records and API behaviour

- One immutable attempt per learner/client attempt ID, with learner-scoped
  idempotency and a conflicting-retry rejection.
- Server-derived student, enrolment, group, assignment, version, attempt number,
  maximum score, received time, marking source and evidence level.
- Per-question response payloads, awarded marks, correctness, review state and
  question/version integrity.
- Client start/completion context and source-page metadata where bounded and
  useful, while retaining an authoritative server receive timestamp.
- Selected programming language for a Programming Diagnostic attempt when that
  activity is enabled for Supabase persistence.
- First, latest and best attempts; activity/topic/question/group analytics;
  improvement, completion and support indicators derived from immutable rows.
- Existing safe-profile behaviour: a student sees only the approved fields for
  their own profile, while a teacher sees learners only in authorised groups.
- Stable, non-sensitive error semantics for authentication, invalid activity
  versions, incomplete responses, conflicting retries and access failures.

## REGENERATE FROM GIT OR DERIVE IN SQL

- Generate the curriculum manifest from the five reviewed Git activity
  definitions. Do not hand-copy a second question bank.
- Recalculate activity maximum score and question count from question points,
  then verify them against catalogue/backend expectations.
- Generate the activity-version content hash from the canonical manifest.
- Generate section/topic rows and question/topic mappings from reviewed section
  metadata unless a later explicit taxonomy is approved.
- Generate supported-language relationships from
  `FoundationProgrammingLanguage.languages` and each activity's declared
  language list.
- Derive attempt percentages, first/latest/best, improvement, progress,
  completion, question success rate, group averages and students requiring
  support in SQL. These are query results, not independently mutable facts.
- Derive teacher reporting from RLS-scoped views. Do not reproduce dashboard
  cells or cached reporting tabs.
- Use PostgreSQL constraints, indexes, transactions and immutable-version
  triggers instead of spreadsheet row position, locks, formulas or mirror tabs.

## DROP

The following are spreadsheet or Apps Script implementation details and are not
migrated into PostgreSQL:

- spreadsheet IDs, Script Properties, Apps Script deployment URLs, credentials,
  service keys and connection strings;
- formulas, formatting, conditional formatting, filters, dashboard cells,
  setup-guide rows and manual test-case rows;
- implementation-specific sheet row numbers and header-normalisation machinery;
- duplicated `Results`, `Learner Results`, `Submissions v3`, `API Attempt Index`
  and dashboard summaries where immutable attempts plus SQL views provide the
  same answer;
- the spreadsheet-specific `Submission Errors v3` ledger as a data model;
  operational failures belong in platform logs/observability unless a reviewed
  product audit requirement is introduced;
- duplicated learner names, course values and group values on every reporting
  row when foreign keys preserve the correct historical context;
- spreadsheet style configuration and Apps Script setup/version metadata;
- partner fields, session fields and generic collection-workbook columns that
  are not used by the current Software Development Hub contract;
- any synthetic/test learner as production learner data.

## KEEP TEMPORARILY

- Keep the Apps Script project and Google Sheet intact as legacy, rollback and
  reference systems. Do not add new features there unless rollback requires it.
- Keep the current public Apps Script health, `getStudent`,
  `getStudentProgress`, and `submitResult` contracts available during migration.
- Keep the current student-ID UI/session and Apps Script client until the real
  Supabase Auth onboarding method is agreed. Student ID remains identification,
  not authentication.
- Keep browser-local activity progress and retry behaviour. It remains useful
  continuity state but is not authoritative and must not grant data access.
- Use an explicit feature/path decision for Supabase Auth. Never silently turn
  an existing student-ID localStorage session into a Supabase identity.
- Keep the legacy narrow submission path as an explicit fallback until the
  Supabase Requirements Classification path passes remote synthetic security
  and integration verification.

## Apps Script responsibility replacement map

| Legacy responsibility | Supabase replacement |
| --- | --- |
| `getStudent` and ID-only session | Supabase Auth session plus `api.my_profile` backed by `learning.students` |
| `Students` | `learning.students` linked to `auth.users` |
| `Classes` | `learning.groups` plus `learning.enrolments` |
| `ActivityConfig` / `Activities` | Git-generated manifest mirrored to `learning.activities`, immutable `activity_versions`, `questions`, topics and languages |
| `submitResult` | authenticated `api.submit_attempt` |
| `Attempts` / `Submissions v3` | `learning.attempts` |
| `Question Responses v1` | `learning.responses` |
| `Results` / `Learner Results` | first/latest/best and progress SQL views |
| `API Attempt Index` | unique constraints and indexes on attempts |
| spreadsheet progress calculations | RLS-scoped SQL views/queries |
| dashboard/reporting tabs | teacher analytics views |
| Apps Script row locks | one PostgreSQL transaction plus advisory/unique-key protection |
| Apps Script audit row | platform/database observability; add a relational audit table only for an approved audit requirement |
| Apps Script health | Supabase service health plus a minimal safe application health contract if operationally required |

## Controlled future student import format

No production learner rows are created in this migration. A later controlled
import should use UTF-8 CSV with this exact logical shape:

```csv
student_number,first_name,surname,display_name,group_code,active
00012345,Alex,Smith,Alex Smith,L3A,true
```

Import rules:

1. Treat `student_number` and `group_code` as text from ingestion onward.
2. Reject blank/duplicate student numbers, unknown groups, invalid booleans and
   rows missing `first_name` or `display_name`.
3. Stage and validate the whole file before one transactional upsert.
4. Do not create or infer Auth identities from the CSV. Auth provisioning and
   profile linking are separate controlled operations.
5. Do not require or duplicate an email unless the approved Auth onboarding
   method needs one.
6. Produce a reconciliation summary without logging credentials or unnecessary
   personal data.

## Migration gates

- Commit the proven local foundation before major follow-on work.
- Complete local reset, pgTAP and Node regression suites before every remote
  migration dry run.
- Apply remote changes only through reviewed, version-controlled migrations.
- Stop before frontend cutover if any remote anonymous, student or teacher RLS
  check fails.
- Do not remove the Apps Script project or Google Sheet during this migration.
