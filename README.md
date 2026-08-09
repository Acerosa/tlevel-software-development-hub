# T Level Digital Software Development Hub

A GitHub Pages learning hub for the Pearson T Level Digital Software Development Occupational Specialism.

## Purpose

The hub provides one accessible route through technical foundations, projects, Tasks 1 to 3, assessment practice and supporting resources. It includes the reusable application shell, a Supabase Auth session foundation, and a complete Software Development Foundations activity suite.

Learners authenticate with a Supabase Auth session and resolve their safe profile through the exposed `api` views. Public study pages remain available without signing in. Signed-in learners can save completed Foundations scores and question-level evidence as formative learning records.

## Technologies

- semantic HTML5
- modern CSS
- vanilla JavaScript
- GitHub Pages

The site uses no framework, package dependency, external font or build step.

## Current status

**Phase 1: Technical Foundations**

Available shell routes:

- Course Guide
- Foundations
- Projects
- Task 1
- Task 2
- Task 3
- Assessment Practice
- Resources
- Help

Software Development Foundations includes:

- Programming Diagnostic covering seven topics with Python, JavaScript or C# code reading, completion, debugging and small coding exercises
- Requirements Classification
- Problem Decomposition
- Data Design Knowledge Check
- Testing Methods Classification

The five data-driven activities provide immediate explanatory feedback, section results, review and retry controls, browser-local draft recovery and Supabase-backed progress. Completed attempts use one shared `api.submit_attempt` adapter and preserve heterogeneous question evidence. Failed submissions remain local and expose a retry control. They are formative learning activities rather than official Pearson assessment material. The other curriculum routes remain lightweight placeholders for later components.

## Run locally

From the project root:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

Run the dependency-free checks with:

```bash
node --test test/student-foundation.test.js test/site-integrity.test.js test/foundations-activities.test.js
```

## Student API configuration

The browser-safe Supabase project URL and publishable key are configured in `js/config/supabase-config.js`. The legacy Google Apps Script `/exec` URL remains in `js/config/student-api-config.js` for the documented rollback path only.

## Documentation

- [Application architecture](docs/ARCHITECTURE.md)
- [Development guide](docs/DEVELOPMENT.md)

## Security

Do not commit credentials, spreadsheet IDs, learner data or exported submissions. The Supabase publishable key is browser-safe; service-role/secret keys, database passwords and CLI tokens are never client configuration. The Supabase SDK manages Auth persistence. Browser drafts remain local, while authoritative attempts, responses and progress are stored through the scoped `api` views/RPC.

The current architecture, endpoint mapping, onboarding path, rollback procedure and limitations are documented in [docs/supabase-frontend-migration.md](docs/supabase-frontend-migration.md).
