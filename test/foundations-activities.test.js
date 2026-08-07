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

function loadProgrammingRuntime() {
  const browserWindow = {};
  run("js/activities/programming-language.js", browserWindow);
  run("js/activities/programming-checker.js", browserWindow);
  run("js/activities/activity-marking.js", browserWindow);
  run("js/data/foundations/programming-diagnostic.js", browserWindow);
  return browserWindow;
}

function questionById(activity, questionId) {
  return allQuestions(activity).find(function (question) { return question.id === questionId; });
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

test("Programming Diagnostic exposes exactly three maintainable language variants", function () {
  const runtime = loadProgrammingRuntime();
  const activity = runtime.FoundationActivityData;
  const resolver = runtime.FoundationProgrammingLanguage;

  assert.deepEqual(Array.from(activity.supportedProgrammingLanguages), ["python", "javascript", "csharp"]);
  assert.equal(activity.requiresProgrammingLanguage, true);
  assert.deepEqual(Array.from(resolver.languages, function (language) { return language.id; }), [
    "python", "javascript", "csharp"
  ]);
  assert.deepEqual(Array.from(resolver.validateActivity(activity)), []);

  allQuestions(activity).filter(function (question) { return question.languages; }).forEach(function (question) {
    assert.deepEqual(Object.keys(question.languages), ["python", "javascript", "csharp"], question.id);
  });

  ["python", "javascript", "csharp"].forEach(function (languageId) {
    const resolved = resolver.resolveActivity(activity, languageId);
    assert.equal(resolved.programmingLanguage, languageId);
    assert.equal(resolved.sections.length, 7);
    allQuestions(resolved).forEach(function (question) {
      assert.equal(question.languages, undefined, question.id + " leaked its variant map");
    });
  });
});

test("language resolution fails clearly when a required variant is missing", function () {
  const runtime = loadProgrammingRuntime();
  const incomplete = {
    id: "TEST-LANGUAGE-001",
    languages: { python: { code: "print(1)" } }
  };
  assert.throws(function () {
    runtime.FoundationProgrammingLanguage.resolveQuestion(incomplete, "javascript");
  }, /no javascript variant/);
});

test("programming sections use knowledge, code-reading and hands-on evidence", function () {
  const activity = loadActivity("programming-diagnostic.js");
  const programmingSections = activity.sections.slice(0, 6);
  const richTypes = ["predict-output", "code-gap", "line-select", "code-order", "code-editor"];

  programmingSections.forEach(function (section) {
    const skills = new Set(section.questions.map(function (question) { return question.skill; }));
    const richQuestions = section.questions.filter(function (question) {
      return richTypes.includes(question.type);
    });
    assert.ok(skills.has("knowledge") || section.id === "debugging", section.id + " lacks knowledge evidence");
    assert.ok(skills.has("code-reading") || section.id === "debugging", section.id + " lacks code-reading evidence");
    assert.ok(skills.has("coding-debugging"), section.id + " lacks coding/debugging evidence");
    assert.ok(richQuestions.length >= 3, section.id + " needs at least three programming interactions");
  });

  const sql = activity.sections[6];
  assert.equal(sql.questions.some(function (question) { return question.languages; }), false);
  assert.ok(sql.questions.filter(function (question) { return richTypes.includes(question.type); }).length >= 4);
});

test("resolved code uses the selected language and contains no invented pseudocode", function () {
  const runtime = loadProgrammingRuntime();
  const activity = runtime.FoundationActivityData;
  const signatures = {
    python: [/print\(/, /range\(/, /def /],
    javascript: [/console\.log\(/, /\b(?:let|const)\b/, /function /],
    csharp: [/Console\.WriteLine\(/, /\bint\b/, /static int/]
  };

  Object.keys(signatures).forEach(function (languageId) {
    const resolved = runtime.FoundationProgrammingLanguage.resolveActivity(activity, languageId);
    const programmingSource = resolved.sections.slice(0, 6).flatMap(function (section) {
      return section.questions;
    }).map(function (question) {
      return [question.code, question.beforeGap, question.afterGap, question.starterCode]
        .concat((question.items || []).map(function (item) { return item.code; }))
        .filter(Boolean)
        .join("\n");
    }).join("\n");

    signatures[languageId].forEach(function (signature) {
      assert.match(programmingSource, signature, languageId + " lacks expected beginner syntax");
    });
    assert.doesNotMatch(programmingSource, /\b(?:DISPLAY|END IF|END FOR|END WHILE|FOR EACH|END FUNCTION)\b/i);
  });
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

test("deterministic programming marking accepts harmless formatting and rejects wrong code", function () {
  const runtime = loadProgrammingRuntime();
  const resolver = runtime.FoundationProgrammingLanguage;
  const checker = runtime.FoundationProgrammingChecker;
  const activity = runtime.FoundationActivityData;
  const correctVariables = {
    python: "score   =   10",
    javascript: "let score=10;",
    csharp: "int score = 10;"
  };
  const correctLoops = {
    python: "range(1,6)",
    javascript: "number<=5",
    csharp: "number <= 5"
  };

  ["python", "javascript", "csharp"].forEach(function (languageId) {
    const resolved = resolver.resolveActivity(activity, languageId);
    const variable = questionById(resolved, "FOUND-PROG-VAR-003");
    const loopGap = questionById(resolved, "FOUND-PROG-ITER-003");
    const badLine = questionById(resolved, "FOUND-PROG-DEBUG-001");
    const order = questionById(resolved, "FOUND-PROG-ITER-005");

    assert.equal(checker.mark(variable, correctVariables[languageId]).correct, true, languageId);
    assert.equal(checker.mark(variable, "score = 9").correct, false, languageId);
    assert.equal(checker.mark(loopGap, correctLoops[languageId]).correct, true, languageId);
    assert.equal(checker.mark(loopGap, "number < 5").correct, false, languageId);
    assert.equal(checker.mark(badLine, "2").correct, true, languageId);
    assert.equal(checker.mark(badLine, "1").correct, false, languageId);
    assert.equal(checker.mark(order, Array.from(order.answer)).correct, true, languageId);
    assert.equal(checker.mark(order, Array.from(order.answer).reverse()).correct, false, languageId);
  });

  const sql = questionById(resolver.resolveActivity(activity, "python"), "FOUND-PROG-SQL-005");
  assert.equal(checker.mark(sql, "UPDATE customers\nSET active = true\nWHERE customer_id = 'C02';").correct, true);
  assert.equal(checker.mark(sql, "UPDATE customers\nSET active = true;").correct, false);
  assert.equal(checker.normaliseOutput("  One  \r\n Two ", false), "one\ntwo");
});

test("programming results include the selected language and broad skill summaries", function () {
  const runtime = loadProgrammingRuntime();
  const activity = runtime.FoundationProgrammingLanguage.resolveActivity(runtime.FoundationActivityData, "python");
  const responses = {};
  allQuestions(activity).forEach(function (question) {
    if (question.type === "single") {
      responses[question.id] = question.answer;
    } else if (question.type === "multiple" || question.type === "order" || question.type === "code-order") {
      responses[question.id] = Array.from(question.answer);
    } else if (question.type === "matching") {
      responses[question.id] = Object.assign({}, question.answer);
    } else if (question.type === "line-select") {
      responses[question.id] = question.answer;
    } else if (question.type === "text" || question.type === "predict-output" || question.type === "code-gap") {
      responses[question.id] = question.answers[0];
    } else if (question.type === "code-editor") {
      responses[question.id] = question.accepted ? question.accepted[0] : question.starterCode;
    }
  });

  const result = runtime.FoundationActivityMarking.createResult(activity, {
    attemptId: "programming-attempt",
    startedAt: "2026-08-07T10:00:00.000Z",
    responses: responses
  }, "2026-08-07T10:15:00.000Z");

  assert.equal(result.programmingLanguage, "python");
  assert.equal(result.programmingLanguageLabel, "Python");
  assert.deepEqual(Array.from(result.skills, function (skill) { return skill.skillId; }), [
    "knowledge", "code-reading", "coding-debugging"
  ]);
  assert.equal(result.sections.length, 7);
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

test("activity reset can preserve the selected language without preserving answers", function () {
  const storage = createStorage();
  const browserWindow = {
    localStorage: storage,
    StudentContext: { getStudentId: function () { return "00000001"; } },
    crypto: { randomUUID: function () { return "uuid-language"; } }
  };
  run("js/activities/activity-state.js", browserWindow);
  const activity = { id: "foundations-language", version: "2.0.0", sections: [{ id: "variables" }] };
  const store = browserWindow.FoundationActivityState.createStore(activity);
  const attempt = store.start();
  attempt.programmingLanguage = "javascript";
  attempt.responses.Q1 = "answer";
  store.save(attempt);

  const reset = store.reset({ programmingLanguage: "javascript" });
  assert.equal(reset.programmingLanguage, "javascript");
  assert.deepEqual(Object.keys(reset.responses), []);
  assert.deepEqual(Array.from(reset.submittedSections), []);
});

test("guest activity progress can be adopted by the newly signed-in learner", function () {
  const storage = createStorage();
  let studentId = null;
  const browserWindow = {
    localStorage: storage,
    StudentContext: { getStudentId: function () { return studentId; } },
    crypto: { randomUUID: function () { return "uuid-adopt"; } }
  };
  run("js/activities/activity-state.js", browserWindow);
  const activity = { id: "foundations-adopt", version: "1.0.0", sections: [{ id: "start" }] };
  const guestStore = browserWindow.FoundationActivityState.createStore(activity);
  const guestAttempt = guestStore.start();
  guestAttempt.responses.Q1 = "answer";
  guestStore.save(guestAttempt);

  studentId = "00000001";
  const studentStore = browserWindow.FoundationActivityState.createStore(activity);
  const adopted = studentStore.adopt(guestAttempt);

  assert.equal(adopted.learnerKey, "00000001");
  assert.equal(studentStore.load().responses.Q1, "answer");
  assert.equal(guestStore.load().responses.Q1, "answer");
});

test("Foundations code does not execute learner-supplied code", function () {
  const source = [
    "js/activities/activity-engine.js",
    "js/activities/activity-marking.js",
    "js/activities/programming-language.js",
    "js/activities/programming-checker.js",
    "js/activities/programming-feedback.js",
    "js/activities/programming-editor.js"
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
    const learningApiIndex = html.indexOf("learning-api.js");
    const dataIndex = html.indexOf(dataFile);
    const engineIndex = html.indexOf("activity-engine.js");

    assert.ok(markingIndex > -1);
    assert.ok(stateIndex > markingIndex);
    assert.ok(learningApiIndex > -1);
    assert.ok(learningApiIndex < engineIndex);
    assert.ok(dataIndex > stateIndex);
    assert.ok(engineIndex > dataIndex);
    assert.match(html, /data-foundation-activity/);
    assert.match(html, /activities\.css/);
  });
});

test("activity results use the shared learning adapter with retry and identity rebinding", function () {
  const engine = read("js/activities/activity-engine.js");
  const learningApi = read("js/core/learning-api.js");

  assert.match(engine, /learningApi\.submitResult\(attempt\.result\)/);
  assert.match(engine, /StudentContext\.subscribe\(rebindLearnerState\)/);
  assert.match(engine, /retry-submission/);
  assert.match(learningApi, /action: "submitResult"/);
  assert.match(learningApi, /studentContext\.getStudentId\(\)/);
  assert.doesNotMatch(learningApi, /displayName/);
});

test("Programming Diagnostic loads its editor, checker and feedback layers separately", function () {
  const html = read("foundations/programming-diagnostic/index.html");
  const checkerIndex = html.indexOf("programming-checker.js");
  const feedbackIndex = html.indexOf("programming-feedback.js");
  const editorIndex = html.indexOf("programming-editor.js");
  const dataIndex = html.indexOf("programming-diagnostic.js");
  const engineIndex = html.indexOf("activity-engine.js");

  assert.ok(checkerIndex > -1);
  assert.ok(feedbackIndex > checkerIndex);
  assert.ok(editorIndex > feedbackIndex);
  assert.ok(dataIndex > editorIndex);
  assert.ok(engineIndex > dataIndex);
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

test("programming interactions expose keyboard, reset, copy and live-feedback controls", function () {
  const editor = read("js/activities/programming-editor.js");
  const engine = read("js/activities/activity-engine.js");
  const css = read("css/activities.css");

  assert.match(editor, /data-programming-action=\\?"reset/);
  assert.match(editor, /data-programming-action=\\?"copy/);
  assert.match(editor, /data-programming-action=\\?"move-up/);
  assert.match(editor, /data-programming-action=\\?"move-down/);
  assert.match(editor, /event\.key === "Enter"/);
  assert.match(editor, /aria-live=\\?"polite/);
  assert.match(editor, /aria-label=\\?"Code editor|>Code editor</);
  assert.match(engine, /Changing language will restart this diagnostic/);
  assert.match(css, /\.programming-editor:focus/);
  assert.match(css, /overflow-x: auto/);
});
