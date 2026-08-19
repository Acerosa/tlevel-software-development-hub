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
  assert.equal(pkg.version, "0.3.0");
  const foundationIds = pkg.activities
    .filter((item) => String(item.id).startsWith("foundations-"))
    .map((item) => item.id);
  assert.deepEqual(foundationIds, [
    "foundations-programming-diagnostic",
    "foundations-requirements-classification",
    "foundations-problem-decomposition",
    "foundations-data-design",
    "foundations-testing-methods"
  ]);
  assert.equal(pkg.activities[0].version, "2.0.0");
});

test("Week 1 follows the 22-week OS teaching sequence", () => {
  const week = pkg.weeks.find((item) => item.id === "week-1");
  assert.ok(week);
  assert.equal(week.metadata.teachingWeek, 1);
  assert.equal(week.metadata.title, "Client briefs and project context");
  assert.deepEqual(week.relationships.sessions, [
    "week-1-lesson-1",
    "week-1-lesson-2",
    "week-1-lesson-3",
    "week-1-homework"
  ]);
  const lessonKinds = week.relationships.sessions.map((id) => {
    const session = pkg.sessions.find((item) => item.id === id);
    return session && session.metadata.kind;
  });
  assert.deepEqual(lessonKinds, ["session", "session", "session", "homework"]);
  assert.equal(pkg.weeks.filter((item) => item.metadata.teachingWeek > 3).length, 0);
  assert.ok(pkg.learningOutcomes.some((item) => item.id === "os-1-1"));
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
  assert.match(read("src/curriculum/from-package.ts"), /filter\(\(activity\) => activity.id.startsWith\("foundations-"\)\)/);
});

test("a published package change does not require the Git teaching snapshot", () => {
  const git = read("js/data/foundations/requirements-classification.js");
  const activity = pkg.activities.find((item) => item.id === "foundations-requirements-classification");
  activity.metadata.title = "Edited in Admin without a Git commit";
  assert.match(git, /Requirements Classification/);
  assert.doesNotMatch(git, /Edited in Admin without a Git commit/);
});
