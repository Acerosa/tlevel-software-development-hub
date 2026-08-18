const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "content/tlevel-software-development/package.json"), "utf8"));

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("the converted T Level package keeps Foundations identity and activity ids", () => {
  assert.equal(pkg.hub.id, "tlevel-software-development");
  assert.equal(pkg.curriculum.metadata.course, "t-level-digital-software-development");
  assert.equal(pkg.version, "0.2.0");
  assert.equal(pkg.weeks.length, 1);
  assert.equal(pkg.weeks[0].id, "foundations");
  assert.equal(pkg.activities.length, 5);
  assert.deepEqual(pkg.activities.map((item) => item.id), [
    "foundations-programming-diagnostic",
    "foundations-requirements-classification",
    "foundations-problem-decomposition",
    "foundations-data-design",
    "foundations-testing-methods"
  ]);
  assert.equal(pkg.activities[0].version, "2.0.0");
});

test("T Level runtime identity uses the registered T Level course", () => {
  assert.match(read("src/config.ts"), /t-level-digital-software-development/);
  assert.match(read("js/config/app-config.js"), /t-level-digital-software-development/);
  assert.doesNotMatch(read("src/config.ts"), /ocr-level-3-it/);
});

test("the live hub loads teaching content through platform.curriculum.loadLatest", () => {
  assert.match(read("src/hooks/useHubPlatform.ts"), /loadTLevelCurriculum\(platform\)/);
  assert.match(read("src/platform.ts"), /validatePackage/);
  assert.match(read("src/platform.ts"), /loadBundled/);
  assert.doesNotMatch(read("src/platform.ts"), /published_curriculum_package/);
  assert.match(read("src/activities/bootstrap.ts"), /foundationActivityFromPackage/);
  assert.match(read("js/data/foundations/catalog.js"), /__lpPublishedCurriculum/);
});

test("a published package change does not require the Git teaching snapshot", () => {
  const git = read("js/data/foundations/requirements-classification.js");
  const activity = pkg.activities.find((item) => item.id === "foundations-requirements-classification");
  activity.metadata.title = "Edited in Admin without a Git commit";
  assert.match(git, /Requirements Classification/);
  assert.doesNotMatch(git, /Edited in Admin without a Git commit/);
});
