const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const routeFiles = [
  "index.html",
  "course-guide/index.html",
  "foundations/index.html",
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

test("all ten GitHub Pages routes load the student foundation in dependency order", function () {
  const scripts = [
    "app-config.js",
    "student-api-config.js",
    "utils.js",
    "student-session.js",
    "student-api.js",
    "student-context.js",
    "navigation.js",
    "student-ui.js"
  ];

  assert.equal(routeFiles.length, 10);
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

test("student sign in uses one text ID and does not introduce passwords", function () {
  const sourceFiles = routeFiles.concat([
    "js/core/student-ui.js",
    "js/core/student-api.js",
    "js/core/student-session.js",
    "js/core/student-context.js"
  ]);
  const source = sourceFiles.map(read).join("\n");

  assert.doesNotMatch(source, /type=["'](?:password|number)["']/i);
  const studentUi = read("js/core/student-ui.js");
  assert.match(studentUi, /name="studentId" type="text"/);
  assert.match(read("js/core/student-context.js"), /getStudentId/);
});

test("API configuration is central and contains no committed learner list", function () {
  const config = read("js/config/student-api-config.js");
  const allJavaScript = fs.readdirSync(path.join(projectRoot, "js/core"))
    .filter(function (filename) { return filename.endsWith(".js"); })
    .map(function (filename) { return read("js/core/" + filename); })
    .join("\n");

  assert.match(
    config,
    /apiUrl:\s*"https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec"/
  );
  assert.equal(
    (config.match(/script\.google\.com\/macros\/s\//g) || []).length,
    1
  );
  assert.doesNotMatch(allJavaScript, /script\.google\.com\/macros\/s\//);
  assert.doesNotMatch(allJavaScript, /student(?:s|List)\s*=\s*\[/i);
});

test("the current site has no legacy activity submission to disrupt", function () {
  const html = routeFiles.map(read).join("\n");
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /submit(?:Result|Attempt|Activity)/i);
});
