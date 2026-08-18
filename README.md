# T Level Digital Software Development Hub

The learner hub for the Pearson T Level Digital Software Development
Occupational Specialism. It is a **current-generation** hub in the
Contract-First Modular Hub Architecture: Core `0.2.0` with a GitHub Pages
Vite application and a React/`@learning-platform/ui` shell around classic
Foundations engines.

Platform-wide architecture is documented in `learning-platform-backend`
`docs/architecture.md`.

## Responsibilities

This repository owns curriculum-specific routes, Foundations activity content,
deterministic formative marking, programming exercise UI, and browser draft
recovery. It does not own learner identity, enrolments, assignments, backend
progress, or platform administration.

Shared platform behaviour comes from:

- `learning-platform-core` 0.2.0 for Supabase Auth/session restoration, staged
  learner onboarding, learner context, theme behaviour, shared account UI,
  platform state, and learner API services;
- `learning-platform-backend` learner API contract 0.1.0 for controlled
  registration, profiles, enrolments, assignments, attempts, responses, and
  progress.

The reviewed repository metadata is declared in
[`learning-platform-hub.json`](learning-platform-hub.json). The backend remains
the authoritative runtime hub registry; GitHub is not a runtime dependency.

## Current learner functionality

- Supabase registration, email-confirmation continuation, sign in/out, and
  session restoration;
- controlled onboarding through backend registration options;
- backend-derived learner profile, enrolment, assignment, attempt, response,
  and progress context;
- five data-driven Foundations activities, including Python, JavaScript, and C#
  programming diagnostics;
- local draft recovery and retry-safe formative submissions;
- responsive navigation and light/dark/system themes.

The curriculum routes remain public. A signed-in, onboarded learner can submit
completed Foundations attempts through `api.submit_attempt`; the backend derives
the authenticated learner and assignment.

## Static Core dependency

GitHub Pages serves the Vite bundle. Reviewed Core 0.2.0 is consumed as
`@learning-platform/core` at build time. Node tests also vendor the same
browser assets under `vendor/learning-platform-core/0.2.0/`. Provenance is
recorded beside those assets. Supabase JS is pinned at the exact browser
version supported by the integration.

This keeps GitHub, npm, or the Core repository from becoming runtime
dependencies of the deployed site.

## Run and test

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`, then run:

```bash
node --test
```

The Node suite checks route integrity, Core loading order, authentication and
learner-context adapters, onboarding composition, activity behaviour,
submissions, progress, manifest consistency, and the static GitHub Pages build.
Database tests under `supabase/tests/` are retained for local contract
verification; production schema changes belong to `learning-platform-backend`.

## Submission compatibility boundary

The deployed submission contract 0.1.0 still requires the hub's formative
`awarded_score` and `is_correct` fields. `js/core/supabase-learning-api.js` is a
small, isolated compatibility adapter that uses the Core-owned Supabase client
and calls only `api.submit_attempt`. It never sends learner, enrolment,
assignment, attempt-number, or total-score identity fields.

Core's evidence-only submission service cannot replace this adapter until a
reviewed backend contract accepts neutral evidence and performs authoritative
marking. Removing it earlier would break existing submissions.

## Documentation

- [Application architecture](docs/ARCHITECTURE.md)
- [Development and verification](docs/DEVELOPMENT.md)

## Security

Only the browser-safe Supabase project URL and publishable key are client
configuration. Never commit service-role keys, access tokens, database
passwords, Auth passwords, private learner records, or exported submissions.
Supabase JS owns session persistence; learner identity is derived from the
authenticated user by backend API/RLS policy.
