# Cursor handoff: Unit 3 frontend migration

This is an implementation handoff for the Unit 3 Cyber Security frontend. **Do not modify the backend repository, migrations, RLS, API views, or RPCs.**

## Repositories

- Frontend: `/Users/ricardorosa/Projects/unit-3-Cyber-Security-Hub`
- Backend: `/Users/ricardorosa/Projects/tlevel-software-development-hub`

## Supabase configuration

- Project ref: `hubwpkrqndorznwzvaer`
- URL: `https://hubwpkrqndorznwzvaer.supabase.co`
- Use only the public publishable browser key already configured for the frontend. Never use a service-role key.

## Auth and API rules

Sign in with Supabase Auth. The backend maps the Auth user to the learner profile using `auth.uid()`. Never send learner, group, assignment, score, or attempt identity fields from the browser.

Use the `api` schema only. Available learner-safe views:

| View | Purpose |
|---|---|
| `api.my_profile` | signed-in learner profile |
| `api.my_enrolments` | learner course/group enrolments |
| `api.my_assignments` | assigned activities |
| `api.my_activity_delivery` | active week/session delivery |
| `api.curriculum_weeks` | active curriculum weeks |
| `api.my_attempts` | learner attempt history |
| `api.my_responses` | learner response evidence |
| `api.my_activity_progress` | derived progress |

Teacher analytics views are group-scoped and should not be used for learner UI. The `learning` schema is private and must never be queried directly.

## Submission

Call `api.submit_attempt`:

```js
supabase.rpc('submit_attempt', {
  p_activity_key,
  p_activity_version,
  p_client_attempt_id,
  p_responses,
  p_source_page,
  p_started_at,
  p_completed_at,
  p_programming_language
});
```

`p_responses` is heterogeneous JSON evidence. Preserve the existing activity response shapes for single-choice, matching, multi-mark text, and reflection evidence. Do not send `student_id`, `enrolment_id`, `assignment_id`, `attempt_number`, `max_score`, or authoritative timestamps. The RPC derives identity, eligibility, totals, and attempt number. Retrying the same client attempt is idempotent; changing its payload is rejected.

## Unit 3 identifiers and counts

- Course: `ocr-level-3-it`
- Module: `unit-3-cyber-security`
- 7 curriculum weeks
- 76 activities
- 76 activity versions
- 472 imported scored question rows

Activity and version keys are stable. Question IDs are unique only within an activity version; repeated textual IDs across activities are valid. Activity teaching content remains in the frontend/static source for now. Supabase supplies identity, delivery, catalogue metadata, question/scoring metadata, attempts, responses, progress, and analytics. Private answer keys and mark schemes are not exposed.

## Recommended migration sequence

1. Add the public Supabase configuration/client.
2. Implement Supabase Auth/session handling.
3. Load profile and enrolment context.
4. Load curriculum weeks and activity delivery.
5. Wire one submission adapter to `api.submit_attempt`.
6. Add attempts/history/progress views.
7. Migrate one representative activity and run synthetic tests.
8. Migrate the remaining activities.
9. Keep Apps Script as an explicit rollback feature flag during cutover.
10. Remove Apps Script only after complete hosted validation.

Preserve the semantic behaviour of the current Apps Script activities while changing only the transport/backend boundary. Do not create a second Supabase project, expose private tables, or alter backend code in the frontend migration.
