# Development and verification

## Local site

No install or build is required. Use a local server rather than opening files
directly:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Shared platform dependency

The hub consumes the browser build of `@learning-platform/core` 0.1.0 from
`vendor/learning-platform-core/0.1.0/`. Do not deep-import Core source modules or
copy Core services into `js/core/`.

To update Core:

1. select one reviewed Core release/commit compatible with the manifest;
2. copy its unmodified IIFE build, source map, theme/tokens CSS, and licence into
   a new versioned vendor directory;
3. update `PROVENANCE.md`, `learning-platform-hub.json`, and `APP_CONFIG`;
4. pin the supported exact Supabase JS browser version;
5. update all route references and run the full verification suite;
6. keep the old vendor directory until the reviewed rollback window closes.

Do not load Core, a hub manifest, or metadata from GitHub at runtime.

## Configuration and script order

`js/config/supabase-config.js` contains only the public project URL and
publishable key. `js/config/app-config.js` contains hub metadata, navigation,
feature flags, and brand colours.

Every route must load, in order:

1. the synchronous no-flash theme bootstrap;
2. hub and Supabase public configuration;
3. pinned Supabase JS;
4. the versioned Core IIFE;
5. `utils.js` and the `platform.js` composition root;
6. theme/context/submission/progress compatibility adapters;
7. navigation and shared account UI;
8. page-specific curriculum modules.

Core/Supabase own the session. Never add a local token store, REST refresh
fallback, learner profile cache, or second `createClient()` call.

## Tests

Run all repository tests:

```bash
node --test
```

Run syntax and whitespace checks:

```bash
for file in js/config/*.js js/core/*.js js/activities/*.js js/data/foundations/*.js; do node --check "$file"; done
git diff --check
```

Validate the canonical manifest with the backend's read-only validator:

```bash
mkdir -p /tmp/learning-platform-empty-hub-registry
python3 ../learning-platform-backend/scripts/import/validate-hub-manifest.py \
  learning-platform-hub.json \
  --registry /tmp/learning-platform-empty-hub-registry
cmp learning-platform-hub.json \
  ../learning-platform-backend/supabase/data/manifests/hubs/tlevel-software-development/learning-platform-hub.json
```

The isolated registry validates this already-registered manifest without
reporting itself as a duplicate; the `cmp` then proves it is byte-for-byte the
reviewed backend copy. New, unregistered hubs should use the validator's normal
registry default so conflict detection remains active.

The repository's `supabase/` directory is a local historical contract fixture,
not the production migration source. If Docker and the Supabase CLI are
available, `supabase db reset` plus `supabase test db` may be used to verify that
snapshot. Do not push it to a hosted project. New backend changes belong in
`learning-platform-backend`.

## Manual learner checks

Before proposing a release:

- register a synthetic learner, handle email confirmation if enabled, and
  complete controlled onboarding;
- sign out/in and reload both root and nested routes to confirm session restore;
- verify profile/group context and backend assignments/progress;
- complete, retry, and revisit each Foundations activity;
- verify Programming Diagnostic in Python, JavaScript, and C#;
- confirm a failed submission keeps the local retry state and a successful retry
  keeps the same client attempt ID;
- verify anonymous users cannot submit and the browser sends no learner,
  enrolment, assignment, role, or total-score identity fields;
- test navigation, account/onboarding dialog, theme, activities, and code editors
  with keyboard-only input at wide and narrow viewports;
- check light, dark, system theme, reduced motion, and the browser console;
- serve the repository root exactly as GitHub Pages will and confirm every local
  asset resolves from all 15 routes.

Use synthetic data only. Never reset, seed, or test destructively against the
hosted production project.

## Adding routes and activities

Add routes to `APP_CONFIG.navigation`, create a directory `index.html`, set the
body's `data-page` and `data-root`, and follow the existing semantic shell. Keep
course-specific route grouping in this repository.

Foundations question data belongs in `js/data/foundations/`; rendering, marking,
draft state, and submission behaviour belong in the existing shared activity
modules. Maintain stable activity/question IDs and semantic versions. Do not add
activity-specific auth, profile, or backend clients.

Programming exercises must not pass learner code to `eval`, `Function`, injected
scripts, frames, browser runtimes, or unreviewed remote execution. Extend the
existing editor/checker/feedback boundary and add positive and negative tests.

## GitHub Pages

Routes and assets use repository-relative URLs, so the site can be published
from the `main` branch repository root. The deployable artifact is the checked-in
tree; no generated documentation page or separate application entry point is
required.

This phase does not authorise deployment, commit, or push.

## Secrets and learner data

Allowed client configuration is limited to the Supabase project URL and public
publishable key. Never commit service-role/secret keys, access/refresh tokens,
database credentials, CLI tokens, Auth passwords, private learner records, or
exported submissions. If exposed, revoke/rotate the credential; deleting it from
a later commit is not sufficient.
