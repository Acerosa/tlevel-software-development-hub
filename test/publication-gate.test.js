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

test("T Level 0.4.3 passes canonical package validation including drag-drop", function () {
  assert.equal(pkg.version, "0.4.3");
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
  const homework = pkg.sessions.find(function (item) { return item.id === "week-1-homework"; });
  assert.ok(homework.relationships.activities.length < 10);
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
  safe.activities.forEach(function (activity) {
    (activity.blocks || []).forEach(function (block) {
      if (block.type !== "drag-drop") return;
      assert.equal("correct" in (block.content || {}), false, activity.id);
      assert.equal(typeof (block.content && block.content.feedback && block.content.feedback.correct), "string", activity.id);
    });
  });
});
