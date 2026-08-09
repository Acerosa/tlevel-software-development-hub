# Supabase frontend migration

Status: Supabase is the default browser backend for the five Foundations activities. The Google Apps Script project and Google Sheet remain intact as an explicit rollback/reference path.

## Runtime boundary

GitHub Pages loads the browser-safe Supabase publishable key and the official `@supabase/supabase-js` client. `js/core/supabase-client.js` creates one client with SDK-managed session persistence, refresh and sign-out. The browser calls only `api` views and `api.submit_attempt`; the private `learning` schema is never queried from frontend code.

The application-level session is exposed by `SupabaseAuth` and `StudentContext`. A profile is resolved from the Auth subject through `api.my_profile`, and active group/enrolment context comes from `api.my_enrolments`. Student-number, group and local-storage values are display/context data only and cannot authorise a request.

## Legacy responsibility mapping

| Apps Script / Sheets responsibility | Supabase replacement |
| --- | --- |
| `health` | Auth/API reachability plus hosted migration/configuration checks |
| `getStudent` | Supabase Auth session + `api.my_profile` |
| student identification/session | `SupabaseAuth` + `StudentContext`; SDK-managed Auth persistence |
| `getStudentProgress` | `api.my_activity_progress`, `api.my_attempts`, `api.my_assignments` through `SupabaseAnalytics` |
| `submitResult` | `api.submit_attempt` through the shared `LearningApi` boundary |
| `Students` sheet | `learning.students` linked by `auth_user_id` |
| `Classes` sheet | `learning.groups` and scoped enrolments/access |
| `ActivityConfig` | Git manifest + versioned `learning.activities`, `activity_versions` and `questions` |
| `Attempts` / `Submissions v3` | `learning.attempts` |
| `Results` / `Learner Results` | derived first/latest/best progress and analytics views |
| question-response reporting | `learning.responses` plus topic/question analytics views |
| reporting/dashboard sheets | teacher analytics views consumed by `SupabaseAnalytics.teacherAnalytics()` |
| Apps Script audit rows | Supabase/Auth/Postgres observability; no browser audit write is required |

The legacy Apps Script client remains in `student-api.js`, `student-session.js` and the explicit `backend: "apps-script"` rollback mode. The normal configuration is `backend: "supabase"`; there is no dual-write.

## Activity submission contract

All five activities use the same `LearningApi.submitResult()` path. Activity-specific code supplies the stable activity/version, client attempt ID and marked question responses. The adapter preserves string, array and object response payloads and sends only:

- activity key/version;
- client attempt ID;
- question-level response JSON;
- client mark and correctness;
- source page, client timestamps and selected programming language where applicable.

The RPC derives the Auth-linked learner, active enrolment/group, assignment, attempt number, authoritative maximum score and server timestamps. Identical retries are idempotent; conflicting reuse of an attempt ID is rejected. Failed submissions stay in the browser attempt store for retry.

Programming Diagnostic code is checked by the existing client checker. Its source is persisted as response JSON and labelled client-marked/question-level evidence. No learner code is executed remotely and no secure test-case execution is claimed.

## Controlled onboarding

There are no real learner records in the hosted project. Later onboarding should be an authorised import/provisioning operation that:

1. creates or invites the Auth identity using the agreed school email method;
2. creates `learning.students` with `student_number` as text (preserving leading zeroes);
3. links `students.auth_user_id` to the Auth UUID;
4. creates the active enrolment and group access records;
5. verifies the profile and RLS path with the learner before release.

The browser must never create learner rows or select another learner by student number. Synthetic accounts are used for current integration tests only.

## Rollback

To use the preserved Apps Script implementation in a controlled development rollback, set `backend: "apps-script"` in `js/config/supabase-config.js` and deploy the existing static site configuration. This restores the ID-based legacy sign-in and narrow `submitResult` contract. Do not expose this as a learner-facing toggle and do not dual-write.

## Validation

Run the complete Node suite with `node --test test/*.test.js`. Run local `supabase start`, `supabase db reset --local` and `supabase test db` after any migration change. Hosted synthetic tests use real Auth sessions and verify all five activity payloads, RLS isolation, idempotency, progress and teacher analytics. Do not commit `.env`, passwords, service-role/secret keys, CLI tokens or `supabase/.temp`.

## Production-like GitHub Pages check

The deployed static site is available at <https://acerosa.github.io/tlevel-software-development-hub/>. GitHub Pages builds the repository `main` branch from its root using the legacy Pages deployment; the current production-like deployment is commit `40e79eac843c7b459b31c1606ba9febb5b05f457`.

The site uses the hosted Supabase project `RR NHC Hub` (`hubwpkrqndorznwzvaer`) as its default backend. Auth uses the direct email/password flow with SDK session persistence (`detectSessionInUrl: false`), so this static deployment does not require an OAuth callback route. The configured Supabase Auth Site URL and allowed redirect URLs must remain restricted to the approved Pages origin if the Auth configuration is changed.

The production-like check uses only synthetic Auth identities and verifies deployed sign-in/session restoration, all five Foundations submissions, Programming Diagnostic Python/JavaScript/C# metadata, question-level persistence, progress, analytics, student isolation, teacher-group isolation and anonymous/private-schema denial. No real learner data is present. Before real-student onboarding, establish institution-approved provisioning and separate development/staging and production controls.

## Known limitations

- Student onboarding still requires an institution-approved Auth invitation/password or recovery process.
- Programming code is client-checked, not securely executed.
- The repository provides analytics service/model calls, not a full teacher dashboard.
- The legacy Apps Script/Sheets system remains available for rollback and has not been deleted.
