const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const routeFiles = [
  "index.html",
  "course-guide/index.html",
  "foundations/index.html",
  "foundations/programming-diagnostic/index.html",
  "foundations/requirements-classification/index.html",
  "foundations/problem-decomposition/index.html",
  "foundations/data-design/index.html",
  "foundations/testing-methods/index.html",
  "projects/index.html",
  "task-1/index.html",
  "task-2/index.html",
  "task-3/index.html",
  "assessment-practice/index.html",
  "resources/index.html",
  "help/index.html"
];

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function references(html, attribute) {
  const pattern = new RegExp(attribute + '=(["\\\'])(.*?)\\1', "gi");
  const values = [];
  let match;
  while ((match = pattern.exec(html))) values.push(match[2]);
  return values;
}

function assertLocalReferenceExists(route, reference) {
  if (/^(?:[a-z]+:|#|\/\/)/i.test(reference)) return;
  const cleanReference = reference.split(/[?#]/)[0];
  if (!cleanReference) return;
  let target = path.resolve(projectRoot, path.dirname(route), cleanReference);
  if (cleanReference.endsWith("/") || fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, "index.html");
  }
  assert.equal(fs.existsSync(target), true, route + " references missing local file " + reference);
}

test("all GitHub Pages routes are Vite shells that mount the React hub", function () {
  assert.equal(routeFiles.length, 15);
  routeFiles.forEach(function (route) {
    const html = read(route);
    assert.match(html, /id="root"/);
    assert.match(html, /type="module"/);
    assert.match(html, /src\/main\.tsx/);
    assert.match(html, /theme-bootstrap\.js\?v=2/);
    assert.ok(html.indexOf("theme-bootstrap.js") < html.indexOf('type="module"'));
    assert.doesNotMatch(html, /learning-platform-core\.iife\.js/);
    assert.doesNotMatch(html, /cdn\.jsdelivr\.net/);
  });
  const main = read("src/main.tsx");
  assert.match(main, /@learning-platform\/core\/theme\.css/);
  assert.match(main, /from "\.\/App"/);
});

test("existing routes, page content and local navigation targets remain available", function () {
  const copy = read("src/page-copy.ts");
  const app = read("src/App.tsx");
  assert.match(app, /HubShell/);
  assert.match(app, /mainId|LearnerHeader|pageHeader/);
  assert.match(copy, /Course home/);
  assert.match(copy, /Software Development Foundations/);
  assert.match(copy, /Programming Diagnostic/);
  routeFiles.forEach(function (route) {
    const html = read(route);
    assert.match(html, /data-page=/);
    assert.match(html, /data-root=/);
    assert.match(html, /<title>/i);
    references(html, "href").forEach(function (reference) {
      assertLocalReferenceExists(route, reference);
    });
    references(html, "src").forEach(function (reference) {
      assertLocalReferenceExists(route, reference);
    });
  });
});

test("course navigation marks the active section rather than hard-coding Foundations", function () {
  const navigation = read("src/components/CourseSidebar.tsx");
  assert.match(navigation, /const isCurrent = item\.id === currentPage/);
  assert.match(navigation, /phaseBadge = isCurrent/);
  assert.doesNotMatch(navigation, /item\.id === "foundations"/);
});

test("student account UI uses Core Auth, learner context, and onboarding", function () {
  const hook = read("src/hooks/useHubPlatform.ts");
  const studentUi = read("js/core/student-ui.js");
  const source = [hook, studentUi, read("js/core/student-context.js")].join("\n");
  assert.match(hook, /createAccountDialog/);
  assert.match(hook, /authService:\s*platform\.auth/);
  assert.match(hook, /learnerContext:\s*platform\.learner/);
  assert.match(hook, /onboardingService:\s*platform\.onboarding/);
  assert.match(studentUi, /core\.createAccountDialog/);
  assert.doesNotMatch(read("js/config/supabase-config.js"), /service_role|sb_secret_|sessionStorageKey/i);
  assert.match(read("js/core/student-context.js"), /learner\.subscribe/);
  assert.doesNotMatch(source, /studentSession|accessToken|refreshToken/);
});

test("public configuration is central and contains no secrets or legacy API", function () {
  const config = read("js/config/supabase-config.js") + read("src/supabase-config.ts");
  const allJavaScript = fs.readdirSync(path.join(projectRoot, "js/core"))
    .filter(function (filename) { return filename.endsWith(".js"); })
    .map(function (filename) { return read("js/core/" + filename); })
    .join("\n") + read("src/platform.ts");

  assert.match(config, /projectUrl:\s*"https:\/\/[a-z0-9-]+\.supabase\.co"/i);
  assert.match(config, /publishableKey:\s*"sb_publishable_/);
  assert.doesNotMatch(config + allJavaScript, /script\.google\.com|service_role|sb_secret_|postgresql:\/\//i);
  assert.doesNotMatch(allJavaScript, /student(?:s|List)\s*=\s*\[/i);
  assert.equal(fs.existsSync(path.join(projectRoot, "js/config/student-api-config.js")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, "js/core/supabase-client.js")), false);
  assert.equal(fs.existsSync(path.join(projectRoot, "js/core/supabase-auth.js")), false);
});

test("the current site has no legacy activity submission to disrupt", function () {
  const html = routeFiles.map(read).join("\n");
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /submit(?:Result|Attempt|Activity)/i);
});
