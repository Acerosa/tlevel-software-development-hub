# T Level Digital Software Development Hub

A GitHub Pages learning hub for the Pearson T Level Digital Software Development Occupational Specialism.

## Purpose

The hub will provide one accessible route through technical foundations, projects, Tasks 1–3, assessment practice and supporting resources. The current repository contains **Component 1 only**: the reusable application shell and lightweight landing pages.

It does not yet include curriculum material, learner forms, activities, assessment content, APIs or data storage.

## Technologies

- semantic HTML5
- modern CSS
- vanilla JavaScript
- GitHub Pages

The site uses no framework, package dependency, external font or build step.

## Current status

**Phase 1 – Technical Foundations**

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

These routes are intentionally lightweight placeholders for later components.

## Run locally

From the project root:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

## Documentation

- [Application architecture](docs/ARCHITECTURE.md)
- [Development guide](docs/DEVELOPMENT.md)

## Security

Do not commit API keys, credentials, spreadsheet IDs, Apps Script URLs or learner data. The Component 1 shell requires none of these.
