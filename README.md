# T Level Digital Software Development Hub

A GitHub Pages learning hub for the Pearson T Level Digital Software Development Occupational Specialism.

## Purpose

The hub provides one accessible route through technical foundations, projects, Tasks 1 to 3, assessment practice and supporting resources. It currently includes the reusable application shell, lightweight landing pages, and the student identification and session foundation.

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

These routes are intentionally lightweight placeholders for later curriculum components. The shared header is ready to display the current learner and provide sign-in and sign-out controls.

## Run locally

From the project root:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

Run the dependency-free checks with:

```bash
node --test test/student-foundation.test.js test/site-integrity.test.js
```

## Student API configuration

Set the deployed Google Apps Script Web App `/exec` URL in `js/config/student-api-config.js`. The value is centralised there so it is not repeated across pages. A stable numbered Web App deployment is required before real sign-in can work.

## Documentation

- [Application architecture](docs/ARCHITECTURE.md)
- [Development guide](docs/DEVELOPMENT.md)

## Security

Do not commit API keys, credentials, spreadsheet IDs, learner data or exported submissions. The Apps Script Web App URL is a public client configuration value rather than a secret, but it must remain centralised. The browser stores only the safe student profile returned by `getStudent`.
