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
node --test test/student-foundation.test.js test/site-integrity.test.js
```

Use `node --check` for JavaScript syntax checks when changing browser modules.

## Student API setup

The frontend calls the separate Google Apps Script Web App. Its stable numbered deployment is configured in `js/config/student-api-config.js`. If the deployment is deliberately replaced, set `apiUrl` to the new complete `/exec` URL:

```js
apiUrl: "https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
```

Do not use an editor or development URL. Do not repeat the URL in individual pages or modules. The URL is public browser configuration, not a credential. Never add the spreadsheet ID or real student records to this repository.

The API client sends a text-based POST request to avoid an unnecessary browser preflight. Its body contains `action: "getStudent"` and the student ID as a string. Leading zeroes are preserved.

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

## Secrets and learner data

Never commit:

- API keys or access tokens;
- credentials;
- spreadsheet IDs;
- real learner records or exported submissions.

The public Apps Script `/exec` URL belongs only in `js/config/student-api-config.js`. Do not commit a `/dev` URL, spreadsheet ID or backend configuration details.

Use example data only in future development. If a secret is committed accidentally, treat it as exposed: revoke it and follow the repository’s incident process rather than only deleting the file.
