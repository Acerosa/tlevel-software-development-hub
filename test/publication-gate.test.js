const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const engine = require("@learning-platform/content");

const pkg = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../content/tlevel-software-development/package.json"),
    "utf8"
  )
);

test("T Level 0.4.6 passes canonical package validation including drag-drop", function () {
  assert.equal(pkg.version, "0.4.6");
  function interactiveType(activity) {
    const block = (activity.blocks || []).find(function (item) {
      return item.type === "single-choice" || item.type === "classification" || item.type === "drag-drop" || item.type === "short-response";
    });
    return block ? block.type : null;
  }
  function mixFor(sessionId) {
    const session = pkg.sessions.find(function (item) { return item.id === sessionId; });
    const byId = new Map(pkg.activities.map(function (item) { return [item.id, item]; }));
    const counts = { "single-choice": 0, classification: 0, "drag-drop": 0, "short-response": 0, other: 0, total: 0 };
    session.relationships.activities.forEach(function (id) {
      const type = interactiveType(byId.get(id));
      counts.total += 1;
      if (type && counts[type] != null) counts[type] += 1;
      else counts.other += 1;
    });
    return counts;
  }
  ["week-1-lesson-1", "week-1-lesson-2", "week-1-lesson-3"].forEach(function (sessionId) {
    const mix = mixFor(sessionId);
    assert.ok(mix.total >= 25 && mix.total <= 30, sessionId + " total " + mix.total);
    assert.ok(mix["single-choice"] >= 6 && mix["single-choice"] <= 9, sessionId + " single-choice " + mix["single-choice"]);
    assert.ok(mix.classification >= 5 && mix.classification <= 7, sessionId + " classification " + mix.classification);
    assert.ok(mix["drag-drop"] >= 4 && mix["drag-drop"] <= 6, sessionId + " drag-drop " + mix["drag-drop"]);
    assert.ok(mix["short-response"] >= 7 && mix["short-response"] <= 8, sessionId + " written " + mix["short-response"]);
  });
  ["week-2-lesson-1", "week-2-lesson-2", "week-2-lesson-3"].forEach(function (sessionId) {
    const mix = mixFor(sessionId);
    assert.equal(mix.total, 18, sessionId + " total " + mix.total);
    assert.ok(mix["single-choice"] >= 4 && mix["single-choice"] <= 8, sessionId + " single-choice " + mix["single-choice"]);
    assert.ok(mix.classification >= 3, sessionId + " classification " + mix.classification);
    assert.ok(mix["drag-drop"] >= 3, sessionId + " drag-drop " + mix["drag-drop"]);
    assert.ok(mix["short-response"] >= 4, sessionId + " written " + mix["short-response"]);
    assert.ok(mix["single-choice"] / mix.total <= 0.5, sessionId + " single-choice share too high");
    assert.equal(mix.other, 0, sessionId + " unexpected types");
  });
  const homework = pkg.sessions.find(function (item) { return item.id === "week-1-homework"; });
  assert.ok(homework.relationships.activities.length < 10);
  const week2Homework = pkg.sessions.find(function (item) { return item.id === "week-2-homework"; });
  assert.deepEqual(week2Homework.relationships.activities, ["week-2-homework-emerging"]);
  const result = engine.validatePackage(pkg);
  const unsupported = result.issues.filter(function (issue) {
    return issue.code === "UNSUPPORTED_BLOCK_TYPE";
  });
  assert.equal(unsupported.length, 0, engine.formatIssues(unsupported));
  assert.equal(result.valid, true, engine.formatIssues(result.issues));
  const authoredDrag = pkg.activities.filter(function (activity) {
    return (activity.blocks || []).some(function (block) { return block.type === "drag-drop" && block.content && block.content.correct; });
  });
  assert.ok(authoredDrag.length > 0);
  const safe = engine.learnerSafePackage(pkg);
  const week2Ids = new Set();
  pkg.sessions.filter(function (item) { return String(item.id).startsWith("week-2-"); }).forEach(function (session) {
    (session.relationships.activities || []).forEach(function (id) { week2Ids.add(id); });
  });
  safe.activities.forEach(function (activity) {
    (activity.blocks || []).forEach(function (block) {
      if (block.type === "single-choice") {
        assert.equal("correctOptionId" in (block.content || {}), false, activity.id);
      }
      if (block.type === "classification") {
        (block.content && block.content.items || []).forEach(function (item) {
          assert.equal("correctCategoryId" in item, false, activity.id + ":" + item.id);
        });
      }
      if (block.type !== "drag-drop") return;
      assert.equal("correct" in (block.content || {}), false, activity.id);
      assert.equal(typeof (block.content && block.content.feedback && block.content.feedback.correct), "string", activity.id);
    });
  });
  // Week 2 expanded exercises are authored without teacher-note blocks (unlike compact later weeks).
  week2Ids.forEach(function (id) {
    const activity = safe.activities.find(function (item) { return item.id === id; });
    assert.ok(activity, id);
    (activity.blocks || []).forEach(function (block) {
      assert.notEqual(block.type, "teacher-note", id);
    });
  });
  const authoringOnSafe = engine.validatePackage(safe);
  assert.equal(authoringOnSafe.valid, false);
  assert.ok(authoringOnSafe.issues.some(function (issue) {
    return issue.code === "MISSING_FIELD" && /content\.correct/.test(issue.path);
  }));
  const learnerSafe = engine.validateLearnerSafePackage(safe);
  assert.equal(learnerSafe.valid, true, engine.formatIssues(learnerSafe.issues));
  const strippedDrag = safe.activities.reduce(function (count, activity) {
    return count + (activity.blocks || []).filter(function (block) {
      return block.type === "drag-drop";
    }).length;
  }, 0);
  assert.ok(strippedDrag >= 25, "expected at least 25 learner-safe drag-drop blocks, got " + strippedDrag);
});
