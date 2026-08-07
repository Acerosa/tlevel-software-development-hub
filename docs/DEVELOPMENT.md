# Development guide

## Requirements

The site uses vanilla HTML, CSS and JavaScript. There is no package installation, build process or framework.

Use a local web server rather than opening the HTML files directly. From the repository root, run one of the following:

```bash
python3 -m http.server 8000
```

or, if PHP is already installed:

```bash
php -S localhost:8000
```

Then open `http://localhost:8000/` in a browser.

## Checks

The project has no package dependencies, compiler, bundler, linter or type checker. Run the built-in Node tests from the repository root:

```bash
node --test test/student-foundation.test.js test/site-integrity.test.js test/foundations-activities.test.js
```

Use `node --check` for JavaScript syntax checks when changing browser modules.

`foundations-activities.test.js` validates activity scope, stable IDs, answer keys, feedback, all supported marking types, the result contract, local-state isolation and adoption, safe client-side behaviour, submission integration and activity route dependencies.

## Student API setup

The frontend calls the separate Google Apps Script Web App. Its stable numbered deployment is configured in `js/config/student-api-config.js`. If the deployment is deliberately replaced, set `apiUrl` to the new complete `/exec` URL:

```js
apiUrl: "https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
```

Do not use an editor or development URL. Do not repeat the URL in individual pages or modules. The URL is public browser configuration, not a credential. Never add the spreadsheet ID or real student records to this repository.

The API clients send text-based POST requests to avoid an unnecessary browser preflight. `student-api.js` owns identification. `learning-api.js` owns formative result submission and reads the current ID from `StudentContext`; display names are never used as identifiers. Leading zeroes are preserved.

## GitHub Pages

The project uses relative URLs and directory-based routes, so it can be published from a GitHub project repository.

1. Push the repository to GitHub.
2. Open **Settings**, then **Pages**, for the repository.
3. Select **Deploy from a branch**.
4. Choose the `main` branch and the repository root (`/`).
5. Save and wait for GitHub Pages to publish the site.

The configured Apps Script URL is included in the static files published by GitHub Pages. No server-side environment or secret is required.

## Branch workflow

- `main` contains reviewed, publishable work.
- `dev` is the integration branch for the next coherent component.
- Create short-lived feature branches from `dev`, such as `feature/foundations-navigation`.
- Keep each branch focused on one concern.
- Open a pull request into `dev`, review it, and verify the site before merging.
- Promote a tested component from `dev` to `main` through a separate pull request.

Do not commit directly to `main` unless the project owner explicitly chooses a simpler workflow.

## Commit guidance

Use concise, imperative commit messages that describe the outcome. Examples:

```text
feat: establish T Level hub application shell
docs: record learner context boundary
fix: retain focus when closing mobile navigation
```

Prefer small commits that keep code, tests and related documentation together. Do not mix unrelated formatting or content changes into a feature commit.

## Adding a route

1. Add its entry to `APP_CONFIG.navigation` in `js/config/app-config.js`.
2. Create a directory containing `index.html`.
3. Set `data-page` on the page body to the navigation entry ID.
4. Set `data-root` to the correct relative path back to the repository root.
5. Use relative links for CSS and JavaScript.
6. Add a unique page title, description, one `h1` and a breadcrumb.
7. Test the route from the home page and from the route back to Home.

## Adding a Foundations activity

1. Add stable catalogue metadata to `js/data/foundations/catalog.js`.
2. Create a directory under `foundations/` containing an `index.html` route that follows the existing breadcrumb and shell pattern.
3. Create a data file under `js/data/foundations/` with a stable activity ID, semantic version, sections and stable question IDs.
4. Load shared marking and state modules, then the activity data, then `activity-engine.js`.
5. Use a shared interaction type: `single`, `multiple`, `text`, `matching` or `order`.
6. Provide concise explanatory feedback for both correct and incorrect responses.
7. Extend `foundations-activities.test.js` with the expected activity scope and any new marking rule.
8. Test empty submissions, correct and incorrect answers, section review, retry, saved progress, narrow layouts and keyboard focus.

Question data owns prompts, options, answers, code samples, small tables and feedback. Rendering, DOM events, scoring and persistence belong in the shared activity modules. Do not embed large question banks in HTML or add activity-specific identity forms.

### Programming Diagnostic questions

The Programming Diagnostic route loads these modules between shared state and its question data:

1. `programming-language.js`
2. `programming-checker.js`
3. `programming-feedback.js`
4. `programming-editor.js`

Its additional question types are `predict-output`, `code-gap`, `line-select`, `code-order` and `code-editor`. Each question should identify one of the result skills: `knowledge`, `code-reading` or `coding-debugging`.

To add a language-aware exercise:

1. Keep the concept, prompt, stable question ID, skill and general feedback on the question.
2. Add one variant under each of `languages.python`, `languages.javascript` and `languages.csharp`.
3. Put syntax-specific code, starter code, accepted responses, checking rules and feedback inside the variant.
4. Keep the three variants equivalent in concept and difficulty.
5. Use valid beginner-level syntax and the established naming and output conventions for each language.
6. Add resolution and positive and negative marking cases to `foundations-activities.test.js`.

Basic SQL questions stay outside `languages` and use the shared SQL label. A missing required language variant is a data error and prevents the activity from loading with a partially mixed question bank.

Code-editor marking may normalise line endings and harmless whitespace, compare a small accepted-variant list, or apply explicit required and prohibited patterns. Do not create a loose rule that lets a known incorrect solution pass. If an answer cannot be checked reliably without running it, redesign it as a code gap, line selection, ordering or another constrained interaction.

Learner code must never be passed to `eval`, `Function`, dynamic scripts, executable frames, browser runtimes or remote execution services. The editor, checker and feedback modules form an intentional boundary for a possible future reviewed runner, but no runner exists in this phase.

Foundations progress is stored under `tlevel.softwareDevelopment.foundations.v1`, scoped to the signed-in student ID or a guest key. Guest work is adopted when the learner signs in from an activity and no learner-scoped attempt already exists. A completed signed-in result is sent through the dedicated Learning API adapter. Only activity ID, activity version, attempt ID, score and maximum score are transmitted; response details remain in the browser. Failed requests retain the local result and provide a retry control. These records are formative and are not secure assessment evidence.

## Manual checks

Before merging:

- follow every global navigation link;
- confirm the active page is identified visually and with `aria-current`;
- check the layout at narrow and wide viewport sizes;
- navigate from the address bar using only Tab, Shift+Tab, Enter and Escape;
- confirm the skip link appears on focus and moves focus to main content;
- open and close the mobile menu, including with Escape;
- check that headings remain in a sensible hierarchy;
- inspect the browser console for errors;
- confirm every stylesheet and script loads from both the home page and nested routes.
- open Student sign in and submit an empty ID;
- confirm unknown, inactive and unavailable-service errors use learner-friendly copy;
- sign in with an authorised leading-zero test ID without changing real learner records;
- reload a nested route and confirm the student's name is restored;
- sign out and confirm the stored session is cleared;
- repeat the sign-in checks at a narrow mobile viewport.
- open all five Foundations activities from the landing page;
- submit an empty section and confirm the error summary receives focus;
- complete and retry each supported interaction type;
- select Python, JavaScript and C# in separate clean attempts and confirm the correct syntax appears;
- change language after entering an answer and confirm the restart warning prevents mixed-language progress;
- check predicted output, code gaps, clickable lines, keyboard ordering and code-editor reset;
- use Ctrl or Command plus Enter in a code field and confirm feedback is announced and focused;
- complete the Programming Diagnostic and verify topic scores, skill scores and selected language;
- confirm feedback explains the reason and is not communicated by colour alone;
- confirm section scores and the final total match the submitted responses;
- review complex tables, code samples, ordering controls and the ERD at narrow widths;
- confirm the landing page changes only from saved local activity state;
- check the browser console throughout a full activity completion.

## Secrets and learner data

Never commit:

- API keys or access tokens;
- credentials;
- spreadsheet IDs;
- real learner records or exported submissions.

The public Apps Script `/exec` URL belongs only in `js/config/student-api-config.js`. Do not commit a `/dev` URL, spreadsheet ID or backend configuration details.

Use example data only in future development. If a secret is committed accidentally, treat it as exposed: revoke it and follow the repository’s incident process rather than only deleting the file.
