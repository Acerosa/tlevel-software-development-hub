const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "content/tlevel-software-development/package.json"), "utf8"));

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("week catalogue activities keep interactive blocks in the bundled package", () => {
  const session = pkg.sessions.find((item) => item.id === "week-1-lesson-1");
  const ids = session.relationships.activities;
  assert.ok(ids.length >= 25 && ids.length <= 30);
  assert.equal(ids[0], "week-1-lesson-1-ex-01");
  const byId = new Map(pkg.activities.map((item) => [item.id, item]));
  const types = new Set();
  for (const id of ids) {
    const activity = byId.get(id);
    assert.ok(activity && Array.isArray(activity.blocks) && activity.blocks.length > 0, id);
    const interactive = activity.blocks.filter((block) => (
      block.type === "single-choice" ||
      block.type === "classification" ||
      block.type === "drag-drop" ||
      block.type === "short-response"
    ));
    assert.equal(interactive.length, 1, id + " should have one main interactive block");
    types.add(interactive[0].type);
  }
  assert.ok(types.has("single-choice"));
  assert.ok(types.has("classification"));
  assert.ok(types.has("short-response"));
  assert.ok(types.has("drag-drop"));
});

test("the converted T Level package keeps Foundations identity and activity ids", () => {
  assert.equal(pkg.hub.id, "tlevel-software-development");
  assert.equal(pkg.curriculum.metadata.course, "t-level-digital-software-development");
  assert.equal(pkg.version, "0.4.3");
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

test("Week 1 follows the SoL teaching sequence", () => {
  const week = pkg.weeks.find((item) => item.id === "week-1");
  assert.ok(week);
  assert.equal(week.metadata.teachingWeek, 1);
  assert.equal(week.metadata.title, "Client Brief, Context and Initial Research");
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
  assert.equal(pkg.sessions.find((item) => item.id === "week-1-lesson-1").metadata.status, "available");
  assert.equal(pkg.sessions.find((item) => item.id === "week-1-lesson-2").metadata.status, "planned");
  assert.equal(pkg.sessions.find((item) => item.id === "week-1-lesson-3").metadata.status, "planned");
  assert.equal(pkg.sessions.find((item) => item.id === "week-1-homework").metadata.status, "planned");
  assert.equal(week.metadata.clientScenario.title, "Oakfield Adult Skills Hub: Client Scenario");
  assert.ok(pkg.learningOutcomes.some((item) => item.id === "lo1"));
  assert.ok(pkg.learningOutcomes.some((item) => item.id === "lo2"));
  assert.ok(pkg.learningOutcomes.some((item) => item.id === "lo3"));
});

test("Week 2 follows the SoL teaching sequence", () => {
  const week = pkg.weeks.find((item) => item.id === "week-2");
  assert.ok(week);
  assert.equal(week.metadata.teachingWeek, 2);
  assert.equal(week.metadata.title, "Emerging Technologies, Solutions and Knowledge Gaps");
  assert.deepEqual(week.relationships.sessions, [
    "week-2-lesson-1",
    "week-2-lesson-2",
    "week-2-lesson-3",
    "week-2-homework"
  ]);
  const week1 = pkg.weeks.find((item) => item.id === "week-1");
  assert.equal(week1.metadata.title, "Client Brief, Context and Initial Research");
  assert.equal(pkg.weeks.length, 22);
});

test("Weeks 2 to 22 keep retrieval, main and formative activity ids", () => {
  for (let week = 2; week <= 22; week += 1) {
    for (let lesson = 1; lesson <= 3; lesson += 1) {
      const session = pkg.sessions.find((item) => item.id === `week-${week}-lesson-${lesson}`);
      assert.deepEqual(session.relationships.activities, [
        `week-${week}-lesson-${lesson}-retrieval`,
        `week-${week}-lesson-${lesson}-main`,
        `week-${week}-lesson-${lesson}-formative`
      ]);
    }
  }
});

test("bundled week status is available only for Week 1", () => {
  const statuses = pkg.weeks.map((week) => [week.id, week.metadata.status, week.metadata.teachingWeek]);
  assert.equal(pkg.weeks[0].metadata.status, "available");
  assert.equal(pkg.weeks[0].id, "week-1");
  for (const week of pkg.weeks.slice(1)) {
    assert.equal(week.metadata.status, "planned", week.id + " should be planned until posted");
  }
  assert.equal(statuses.length, 22);
});

test("the 22-week SoL covers Areas 1 to 3 through revision", () => {
  const week = pkg.weeks.find((item) => item.id === "week-3");
  assert.ok(week);
  assert.equal(week.metadata.teachingWeek, 3);
  assert.equal(week.metadata.title, "Business Requirements, Scope and Decomposition");
  assert.deepEqual(week.relationships.sessions, [
    "week-3-lesson-1",
    "week-3-lesson-2",
    "week-3-lesson-3",
    "week-3-homework"
  ]);
  assert.equal(pkg.weeks[0].metadata.title, "Client Brief, Context and Initial Research");
  assert.equal(pkg.weeks[21].metadata.title, "Revision 4 - Integrated Case Study, Readiness and Placement");
  assert.ok(pkg.learningOutcomes.some((item) => item.id === "lo1"));
  assert.ok(!pkg.learningOutcomes.some((item) => item.id === "os-1-1"));
  assert.equal(pkg.assignments.find((item) => item.id === "os-formative").relationships.weeks.length, 22);
});

test("T Level runtime identity uses the registered T Level course", () => {
  assert.match(read("src/config.ts"), /t-level-digital-software-development/);
  assert.match(read("js/config/app-config.js"), /t-level-digital-software-development/);
  assert.doesNotMatch(read("src/config.ts"), /ocr-level-3-it/);
});

test("CI pins the reviewed UI catalogue used by week pages", () => {
  const workflow = read(".github/workflows/pages.yml");
  assert.match(workflow, /Acerosa-learning-platform-ui[\s\S]*ref: v0\.1\.13/);
  assert.match(workflow, /learning-platform-core[\s\S]*ref: v0\.2\.22/);
  assert.match(workflow, /learning-platform-content[\s\S]*ref: v0\.1\.4/);
});

test("the live hub loads teaching content through platform.curriculum.loadLatest", () => {
  assert.match(read("src/hooks/useHubPlatform.ts"), /loadTLevelCurriculum\(platform\)/);
  assert.match(read("src/platform.ts"), /validateLearnerSafePackage/);
  assert.match(read("src/platform.ts"), /validatePackage: validateLearnerSafePackage/);
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
