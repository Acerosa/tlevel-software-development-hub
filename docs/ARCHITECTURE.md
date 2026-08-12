# Application architecture

## Platform role

This repository is the curriculum and learner-experience layer for the T Level
Digital Software Development course. It is a framework-free multi-page site
served directly by GitHub Pages.

Repository ownership is deliberately split:

| Repository | Responsibility |
| --- | --- |
| `learning-platform-core` | Shared browser auth/session, onboarding, learner context, API services, state, theme, and UI primitives |
| `learning-platform-backend` | Authoritative identity, curriculum, enrolments, assignments, attempts, progress, RLS, and API contracts |
| this hub | Course routes/content, Foundations activity rendering, formative marking, programming interactions, and draft UX |
| `learning-platform-admin` | Central platform administration |

The hub manifest describes this repository for reviewed registration. Runtime
hub metadata is read from the backend registry, not from GitHub.

## Runtime composition

Every route loads the same dependency chain:

```text
hub configuration
    -> pinned Supabase JS 2.112.3
    -> vendored learning-platform-core 0.1.0
    -> platform composition
    -> thin hub compatibility adapters
    -> navigation/account UI
    -> optional curriculum activity modules
```

`js/core/platform.js` is the single composition root. It creates the Core
platform with the hub identifier, shared feature flags, navigation metadata,
branding, and public Supabase configuration. Core then owns:

- Auth registration, sign in/out, refresh, and session restore;
- safe pending-onboarding state and controlled registration RPCs;
- learner profile and enrolment context;
- assignments, attempts, responses, and backend progress reads;
- platform state and light/dark/system theme behaviour;
- the shared account and onboarding dialog.

`StudentContext`, `ThemeService`, `SupabaseAnalytics`, and `LearningApi` remain as
thin compatibility names so curriculum modules do not need a risky rewrite.
They delegate to the Core platform and do not create a second client, session,
profile store, or API layer.

## Learner identity and onboarding

Supabase JS is the only Auth session owner. Core restores the session and loads
`api.my_profile` plus `api.my_enrolments`. The hub does not persist a copy of the
learner profile.

Registration is staged by the shared Core account dialog:

1. validate first name, surname, Student ID, email, and password;
2. retain only safe pending profile fields in session storage;
3. create the Supabase Auth account;
4. continue after email confirmation/sign-in when required;
5. read controlled options from `api.registration_options`;
6. call `api.complete_learner_onboarding`;
7. refresh the backend-derived learner context.

The browser never selects an internal learner ID, enrolment ID, or role.

## Activity boundary

Curriculum content and activity interactions remain hub-owned:

```text
activity data
    -> generic renderer
    -> deterministic formative marking
    -> local draft/result
    -> LearningApi compatibility adapter
    -> api.submit_attempt
    -> backend attempts/responses/progress
```

The five Foundations activities keep stable activity/question identifiers and
semantic versions. Programming code is never executed; the checker compares
reviewed deterministic forms and rules.

Local storage contains only draft continuity scoped to a guest or the current
backend learner context. It is not merged into authoritative backend progress.
Guest drafts may be adopted after sign-in, but identity and permissions still
come from Auth and the backend.

## Submission compatibility exception

The backend submission contract 0.1.0 currently validates client formative
`awarded_score` and `is_correct` values against the registered activity
questions. Core 0.1.0's neutral evidence service omits those fields, so directly
switching to it would fail `api.submit_attempt`.

`js/core/supabase-learning-api.js` is therefore retained as the only exception.
It reuses the Core-created Supabase client, restricts calls to the `api` schema,
preserves stable client attempt IDs, and never sends learner/assignment identity
or total scores. Remove it only after a reviewed backend contract and matching
Core release support authoritative evidence-only marking.

## Navigation, layout, and theme

The established hub shell and responsive route structure remain unchanged to
avoid a UI redesign. Navigation metadata is supplied to Core at composition and
the existing renderer uses the same `APP_CONFIG` source for the course-specific
sidebar and mobile menu. The renderer remains hub-owned because Core's generic
six-section navigation does not model this curriculum's Task 1–3 route set.

Core owns theme preference, system-theme observation, DOM application, and the
shared account dialog styles. A small synchronous bootstrap applies the same
Core storage key before deferred JavaScript loads to prevent a theme flash.

## Static deployment and rollback

Core assets are copied from one reviewed upstream commit into a versioned vendor
directory. GitHub Pages serves only repository files; it does not download Core
or contact GitHub/npm at runtime. Rollback means deploying the previous reviewed
hub commit—never replacing backend data with browser state.

## Remaining integration debt

- replace the submission compatibility adapter when backend and Core support the
  same evidence-only authoritative-marking contract;
- move the local `supabase/` migration/test snapshot to a clearly generated
  contract fixture or remove it after backend-owned contract CI is available;
- migrate course navigation DOM to a future Core extension that supports
  curriculum-specific route groups without changing the established UX;
- add automated end-to-end Auth/onboarding checks using approved synthetic
  hosted or local users; unit/static tests cannot prove hosted email delivery.
