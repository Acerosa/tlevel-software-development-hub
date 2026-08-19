const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const zlib = require("node:zlib");

const dist = path.resolve(__dirname, "../../dist");

test("the Vite production build is a static GitHub Pages site", function () {
  assert.equal(fs.existsSync(path.join(dist, ".nojekyll")), true);
  [
    "index.html",
    "course-guide/index.html",
    "foundations/index.html",
    "foundations/programming-diagnostic/index.html",
    "foundations/requirements-classification/index.html",
    "projects/index.html",
    "week-1/index.html",
    "week-2/index.html",
    "week-3/index.html",
    "task-1/index.html",
    "task-2/index.html",
    "task-3/index.html",
    "assessment-practice/index.html",
    "resources/index.html",
    "help/index.html",
    "js/core/theme-bootstrap.js"
  ].forEach(function (file) {
    assert.equal(fs.existsSync(path.join(dist, file)), true, file);
  });
  const home = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  const diagnostic = fs.readFileSync(path.join(dist, "foundations/programming-diagnostic/index.html"), "utf8");
  assert.match(home, /type="module"/);
  assert.match(diagnostic, /data-activity="programming-diagnostic"/);
  assert.doesNotMatch(home + diagnostic, /express|next\/server|Server Actions/i);
  const assets = path.join(dist, "assets");
  const jsFiles = fs.readdirSync(assets).filter(function (name) { return name.endsWith(".js"); });
  const cssFiles = fs.readdirSync(assets).filter(function (name) { return name.endsWith(".css"); });
  assert.ok(jsFiles.length >= 1);
  assert.ok(cssFiles.length >= 1);
  const jsTotal = jsFiles.reduce(function (sum, name) {
    return sum + fs.statSync(path.join(assets, name)).size;
  }, 0);
  const cssTotal = cssFiles.reduce(function (sum, name) {
    return sum + fs.statSync(path.join(assets, name)).size;
  }, 0);
  const gzipTotal = jsFiles.reduce(function (sum, name) {
    return sum + zlib.gzipSync(fs.readFileSync(path.join(assets, name))).length;
  }, 0);
  assert.ok(jsTotal < 900 * 1024, "learner JS should stay under 900KB uncompressed, got " + jsTotal);
  assert.ok(cssTotal < 200 * 1024, "learner CSS should stay under 200KB, got " + cssTotal);
  assert.ok(gzipTotal < 300 * 1024, "learner JS gzip should stay under 300KB, got " + gzipTotal);
  assert.doesNotMatch(jsFiles.join("\n"), /xlsx/i);
});
