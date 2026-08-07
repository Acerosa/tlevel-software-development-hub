const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const dataFiles = [
  "programming-diagnostic.js",
  "requirements-classification.js",
  "problem-decomposition.js",
  "data-design.js",
  "testing-methods.js"
];

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function run(relativePath, browserWindow) {
  const context = vm.createContext({
    window: browserWindow,
    console,
    Date,
    Math,
    Object,
    Array,
    String,
    Number,
    JSON,
    encodeURIComponent
  });
  vm.runInContext(read(relativePath), context, { filename: relativePath });
  return browserWindow;
}

function loadActivity(filename) {
  const browserWindow = {};
  run("js/data/foundations/" + filename, browserWindow);
  return browserWindow.FoundationActivityData;
}

function loadMarking() {
  const browserWindow = {};
  run("js/activities/activity-marking.js", browserWindow);
  return browserWindow.FoundationActivityMarking;
}

function allQuestions(activity) {
  return activity.sections.flatMap(function (section) { return section.questions; });
}

function createStorage() {
  const values = new Map();
  return {
    getItem: function (key) { return values.has(key) ? values.get(key) : null; },
    setItem: function (key, value) { values.set(key, String(value)); },
    removeItem: function (key) { values.delete(key); }
  };
}

test("the Foundations catalogue exposes five stable activities", function () {
  const browserWindow = {};
  run("js/data/foundations/catalog.js", browserWindow);
  const catalog = Array.from(browserWindow.FoundationActivityCatalog);

  assert.equal(catalog.length, 5);
  assert.deepEqual(catalog.map(function (activity) { return activity.id; }), [
    "foundations-programming-diagnostic",
    "foundations-requirements-classification",
    "foundations-problem-decomposition",
    "foundations-data-design",
    "foundations-testing-methods"
  ]);
  catalog.forEach(function (activity) {
    assert.match(activity.version, /^\d+\.\d+\.\d+$/);
    assert.ok(activity.path.startsWith("./"));
    assert.ok(activity.topics.length >= 3);
  });
});

test("activity content meets the useful-scope requirements", function () {
  const activities = Object.fromEntries(dataFiles.map(function (filename) {
    const activity = loadActivity(filename);
    return [activity.id, activity];
  }));
  const programming = activities["foundations-programming-diagnostic"];
  const requirements = activities["foundations-requirements-classification"];
  const decomposition = activities["foundations-problem-decomposition"];
  const dataDesign = activities["foundations-data-design"];
  const testing = activities["foundations-testing-methods"];

  assert.equal(programming.sections.length, 7);
  programming.sections.forEach(function (section) {
    assert.ok(section.questions.length >= 5 && section.questions.length <= 8);
  });
  assert.ok(requirements.sections[0].questions.length >= 12);
  assert.ok(requirements.sections[1].questions.length >= 4);
  assert.ok(decomposition.sections.length >= 4);
  assert.ok(allQuestions(dataDesign).length >= 15);
  assert.ok(testing.sections[0].questions.length >= 12);
  assert.ok(allQuestions(testing).length >= 17);
});

test("all question IDs are stable, unique and include explanatory feedback", function () {
  const ids = new Set();
  dataFiles.forEach(function (filename) {
    const activity = loadActivity(filename);
    allQuestions(activity).forEach(function (question) {
      assert.match(question.id, /^FOUND-[A-Z]+(?:-[A-Z]+)*-\d{3}$/);
      assert.equal(ids.has(question.id), false, "duplicate question ID " + question.id);
      ids.add(question.id);
      assert.ok(question.feedback.correct.length > 20, question.id + " needs useful correct feedback");
      assert.ok(question.feedback.incorrect.length > 20, question.id + " needs useful incorrect feedback");
    });
  });
});

test("every answer key refers to available deterministic values", function () {
  dataFiles.forEach(function (filename) {
    allQuestions(loadActivity(filename)).forEach(function (question) {
      if (question.type === "single" || question.type === "multiple") {
        const available = question.options.map(function (option) { return option.value; });
        const answers = question.type === "multiple" ? question.answer : [question.answer];
        answers.forEach(function (answer) {
          assert.ok(available.includes(answer), question.id + " has an unavailable answer");
        });
      }

      if (question.type === "matching") {
        const available = question.options.map(function (option) { return option.value; });
        assert.equal(
          Object.keys(question.answer).sort().join("|"),
          question.rows.map(function (row) { return row.id; }).sort().join("|")
        );
        Object.values(question.answer).forEach(function (answer) {
          assert.ok(available.includes(answer), question.id + " has an unavailable match");
        });
      }

      if (question.type === "order") {
        assert.equal(
          Array.from(question.answer).sort().join("|"),
          question.items.map(function (item) { return item.id; }).sort().join("|")
        );
      }

      if (question.type === "text") {
        assert.ok(question.answers.length >= 1);
      }
    });
  });
});

test("marking handles every supported interaction type", function () {
  const marking = loadMarking();
  const questionBase = { id: "TEST-001", points: 1, feedback: { correct: "yes", incorrect: "no" } };

  assert.equal(marking.markQuestion(Object.assign({}, questionBase, { type: "single", answer: "a" }), "a").correct, true);
  assert.equal(marking.markQuestion(Object.assign({}, questionBase, { type: "multiple", answer: ["a", "b"] }), ["b", "a"]).correct, true);
  assert.equal(marking.markQuestion(Object.assign({}, questionBase, { type: "multiple", answer: ["a", "b"] }), ["a"]).correct, false);
  assert.equal(marking.markQuestion(Object.assign({}, questionBase, { type: "text", answers: ["return value"] }), " Return   value. ").correct, true);
  assert.equal(marking.markQuestion(Object.assign({}, questionBase, { type: "matching", answer: { a: "1", b: "2" } }), { a: "1", b: "2" }).correct, true);
  assert.equal(marking.markQuestion(Object.assign({}, questionBase, { type: "order", answer: ["a", "b"] }), ["a", "b"]).correct, true);
  assert.equal(marking.markQuestion(Object.assign({}, questionBase, { type: "order", answer: ["a", "b"] }), ["b", "a"]).correct, false);
});

test("result creation follows the shared Learning API-ready shape and boundaries", function () {
  const marking = loadMarking();
  const activity = {
    id: "foundations-test",
    version: "1.2.3",
    sections: [{
      id: "one",
      title: "One",
      questions: [
        { id: "Q1", type: "single", answer: "a", points: 1, feedback: {} },
        { id: "Q2", type: "single", answer: "b", points: 1, feedback: {} }
      ]
    }]
  };
  const result = marking.createResult(activity, {
    attemptId: "attempt-1",
    startedAt: "2026-08-07T10:00:00.000Z",
    responses: { Q1: "a", Q2: "x" }
  }, "2026-08-07T10:05:00.000Z");

  assert.deepEqual(Object.keys(result), [
    "activityId", "activityVersion", "attemptId", "startedAt", "completedAt",
    "score", "maxScore", "percentage", "sections", "responses"
  ]);
  assert.equal(result.score, 1);
  assert.equal(result.maxScore, 2);
  assert.equal(result.percentage, 50);
  assert.equal(result.sections[0].status, "Developing");
  assert.equal(marking.statusForPercentage(49), "Needs Review");
  assert.equal(marking.statusForPercentage(80), "Secure");
});

test("local activity state is lightweight and scoped to the current learner", function () {
  const storage = createStorage();
  let studentId = "00000001";
  const browserWindow = {
    localStorage: storage,
    StudentContext: { getStudentId: function () { return studentId; } },
    crypto: { randomUUID: function () { return "uuid-1"; } }
  };
  run("js/activities/activity-state.js", browserWindow);
  const activity = { id: "foundations-test", version: "1.0.0", sections: [{ id: "start" }] };
  const firstStore = browserWindow.FoundationActivityState.createStore(activity);
  const firstAttempt = firstStore.start();

  assert.match(firstStore.key, /00000001:foundations-test$/);
  assert.equal(typeof firstAttempt.responses, "object");
  firstAttempt.responses.Q1 = "a";
  firstStore.save(firstAttempt);
  assert.equal(firstStore.load().responses.Q1, "a");

  studentId = "00000002";
  const secondStore = browserWindow.FoundationActivityState.createStore(activity);
  assert.notEqual(secondStore.key, firstStore.key);
  assert.equal(secondStore.load(), null);
});

test("Foundations code does not execute learner-supplied code", function () {
  const source = [
    "js/activities/activity-engine.js",
    "js/activities/activity-marking.js"
  ].concat(dataFiles.map(function (filename) {
    return "js/data/foundations/" + filename;
  })).map(read).join("\n");

  assert.doesNotMatch(source, /\beval\s*\(/);
  assert.doesNotMatch(source, /\bFunction\s*\(/);
  assert.doesNotMatch(source, /createElement\s*\(\s*["']script["']/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /script\.google\.com/);
});

test("each activity route loads shared behaviour before its own data and engine", function () {
  const routeData = {
    "programming-diagnostic": "programming-diagnostic.js",
    "requirements-classification": "requirements-classification.js",
    "problem-decomposition": "problem-decomposition.js",
    "data-design": "data-design.js",
    "testing-methods": "testing-methods.js"
  };

  Object.entries(routeData).forEach(function ([route, dataFile]) {
    const html = read("foundations/" + route + "/index.html");
    const markingIndex = html.indexOf("activity-marking.js");
    const stateIndex = html.indexOf("activity-state.js");
    const dataIndex = html.indexOf(dataFile);
    const engineIndex = html.indexOf("activity-engine.js");

    assert.ok(markingIndex > -1);
    assert.ok(stateIndex > markingIndex);
    assert.ok(dataIndex > stateIndex);
    assert.ok(engineIndex > dataIndex);
    assert.match(html, /data-foundation-activity/);
    assert.match(html, /activities\.css/);
  });
});

test("activity controls retain semantic and responsive accessibility hooks", function () {
  const engine = read("js/activities/activity-engine.js");
  const css = read("css/activities.css");

  assert.match(engine, /<fieldset/);
  assert.match(engine, /<legend>/);
  assert.match(engine, /question\.type === "multiple" \? "checkbox" : "radio"/);
  assert.match(engine, /<select/);
  assert.match(engine, /role="progressbar"/);
  assert.match(engine, /aria-live|role="status"/);
  assert.match(css, /@media \(min-width: 64rem\)/);
  assert.match(css, /@media \(max-width: 36rem\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
