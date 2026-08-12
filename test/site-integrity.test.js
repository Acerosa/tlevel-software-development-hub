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

  while ((match = pattern.exec(html))) {
    values.push(match[2]);
  }

  return values;
}

function assertLocalReferenceExists(route, reference) {
  if (/^(?:[a-z]+:|#|\/\/)/i.test(reference)) {
    return;
  }

  const cleanReference = reference.split(/[?#]/)[0];
  if (!cleanReference) {
    return;
  }

  let target = path.resolve(projectRoot, path.dirname(route), cleanReference);
  if (cleanReference.endsWith("/") || fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, "index.html");
  }

  assert.equal(
    fs.existsSync(target),
    true,
    route + " references missing local file " + reference
  );
}

test("all GitHub Pages routes load the Core learner foundation in dependency order", function () {
  const scripts = [
    "/js/core/theme-bootstrap.js",
    "/js/config/app-config.js",
    "/js/config/supabase-config.js",
    "@supabase/supabase-js@2.112.3",
    "learning-platform-core.iife.js",
    "/js/core/utils.js",
    "/js/core/platform.js",
    "/js/core/theme.js?v=2",
    "/js/core/student-context.js",
    "/js/core/supabase-learning-api.js",
    "/js/core/supabase-analytics.js",
    "/js/core/learning-api.js",
    "/js/core/navigation.js",
    "/js/core/student-ui.js"
  ];

  assert.equal(routeFiles.length, 15);
  routeFiles.forEach(function (route) {
    const html = read(route);
    let previousIndex = -1;

    scripts.forEach(function (script) {
      const scriptIndex = html.indexOf(script);
      assert.ok(scriptIndex > previousIndex, route + " must load " + script + " in order");
      previousIndex = scriptIndex;
    });
  });
});

test("existing routes, page content and local navigation targets remain available", function () {
  routeFiles.forEach(function (route) {
    const html = read(route);
    assert.match(html, /<main\b[^>]*id="main-content"/i, route + " needs its main landmark");
    assert.match(html, /<h1\b/i, route + " needs its existing page heading");

    references(html, "href").forEach(function (reference) {
      assertLocalReferenceExists(route, reference);
    });
    references(html, "src").forEach(function (reference) {
      assertLocalReferenceExists(route, reference);
    });
  });
});

test("course navigation marks the active section rather than hard-coding Foundations", function () {
  const navigation = read("js/core/navigation.js");

  assert.match(navigation, /var phaseBadge = item\.id === currentPage/);
  assert.doesNotMatch(navigation, /var phaseBadge = item\.id === "foundations"/);
});

test("student account UI uses Core Auth, learner context, and onboarding", function () {
  const sourceFiles = routeFiles.concat(["js/core/student-ui.js", "js/core/student-context.js"]);
  const source = sourceFiles.map(read).join("\n");

  const studentUi = read("js/core/student-ui.js");
  assert.match(studentUi, /core\.createAccountDialog/);
  assert.match(studentUi, /authService:\s*platform\.auth/);
  assert.match(studentUi, /learnerContext:\s*platform\.learner/);
  assert.match(studentUi, /onboardingService:\s*platform\.onboarding/);
  assert.doesNotMatch(read("js/config/supabase-config.js"), /service_role|sb_secret_|sessionStorageKey/i);
  assert.match(read("js/core/student-context.js"), /learner\.subscribe/);
  assert.doesNotMatch(source, /studentSession|accessToken|refreshToken/);
});

test("public configuration is central and contains no secrets or legacy API", function () {
  const config = read("js/config/supabase-config.js");
  const allJavaScript = fs.readdirSync(path.join(projectRoot, "js/core"))
    .filter(function (filename) { return filename.endsWith(".js"); })
    .map(function (filename) { return read("js/core/" + filename); })
    .join("\n");

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
