const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  learnerSafePackage,
  validatePackage,
  validateLearnerSafePackage,
  formatIssues
} = require("@learning-platform/content");

const root = path.resolve(__dirname, "..");
const bundled = JSON.parse(
  fs.readFileSync(path.join(root, "content/tlevel-software-development/package.json"), "utf8")
);

function publishReadyLearnerPackage() {
  const safe = learnerSafePackage(structuredClone(bundled));
  const week = safe.weeks.find((item) => item.id === "week-1");
  week.metadata.status = "available";
  for (const id of ["week-1-lesson-1", "week-1-lesson-2", "week-1-lesson-3"]) {
    const session = safe.sessions.find((item) => item.id === id);
    session.metadata.status = "available";
  }
  const homework = safe.sessions.find((item) => item.id === "week-1-homework");
  homework.metadata.status = "planned";
  return safe;
}

test("production-style learner-safe package hydrates under learner-safe validation", async () => {
  const { isSessionAccessible } = await import("@learning-platform/core/curriculum-runtime");
  const live = publishReadyLearnerPackage();
  assert.equal(live.weeks.length, 22);
  assert.equal(live.sessions.length, 88);
  assert.equal(live.activities.length, 300);
  assert.equal(validatePackage(live).valid, false);
  const result = validateLearnerSafePackage(live);
  assert.equal(result.valid, true, formatIssues(result.issues));
  assert.equal(
    isSessionAccessible(
      live.weeks.find((item) => item.id === "week-1").metadata.status,
      live.sessions.find((item) => item.id === "week-1-lesson-3").metadata.status
    ),
    true
  );
  assert.equal(
    isSessionAccessible(
      live.weeks.find((item) => item.id === "week-1").metadata.status,
      live.sessions.find((item) => item.id === "week-1-homework").metadata.status
    ),
    false
  );
});

test("hub runtime wires learner-safe validation, not authoring validation", () => {
  const source = fs.readFileSync(path.join(root, "src/platform.ts"), "utf8");
  assert.match(source, /validateLearnerSafePackage/);
  assert.match(source, /validatePackage:\s*validateLearnerSafePackage/);
  assert.doesNotMatch(source, /import\s*\{\s*validatePackage\s*\}/);
});

test("bundled sessions.json Lesson 3 remains planned (visibility comes from publication)", () => {
  assert.equal(bundled.sessions.find((item) => item.id === "week-1-lesson-3").metadata.status, "planned");
  assert.equal(bundled.sessions.find((item) => item.id === "week-1-homework").metadata.status, "planned");
});
