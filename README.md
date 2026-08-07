# T Level Digital Software Development Hub

A GitHub Pages learning hub for the Pearson T Level Digital Software Development Occupational Specialism.

## Purpose

The hub provides one accessible route through technical foundations, projects, Tasks 1 to 3, assessment practice and supporting resources. It includes the reusable application shell, student identification and session foundation, and a complete client-side Software Development Foundations activity suite.

Learners can identify themselves with their allocated student ID through the separate Google Apps Script API. This is lightweight student identification, not password authentication. Public study pages remain available without signing in.

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

- Programming Diagnostic covering seven topics
- Requirements Classification
- Problem Decomposition
- Data Design Knowledge Check
- Testing Methods Classification

The five data-driven activities provide immediate explanatory feedback, section results, review and retry controls, and lightweight browser-local progress. They are formative learning activities rather than official Pearson assessment material. The other curriculum routes remain lightweight placeholders for later components.

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

The stable Google Apps Script Web App `/exec` URL is configured in `js/config/student-api-config.js`. The value is centralised there so it is not repeated across pages. Update the existing backend deployment for future backend versions so the frontend URL remains stable.

## Documentation

- [Application architecture](docs/ARCHITECTURE.md)
- [Development guide](docs/DEVELOPMENT.md)

## Security

Do not commit API keys, credentials, spreadsheet IDs, learner data or exported submissions. The Apps Script Web App URL is a public client configuration value rather than a secret, but it must remain centralised. The browser stores only the safe student profile returned by `getStudent`.
