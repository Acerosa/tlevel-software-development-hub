const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function run(context, file) {
  vm.runInContext(read(file), context, { filename: path.join(root, file) });
}

function context(windowOverrides) {
  const window = Object.assign({ setTimeout, clearTimeout }, windowOverrides || {});
  return { window, context: vm.createContext({ window, console, setTimeout, clearTimeout }) };
}

test("all five Foundations routes use the Supabase boundary", function () {
  const routes = [
    "foundations/requirements-classification/index.html",
    "foundations/problem-decomposition/index.html",
    "foundations/data-design/index.html",
    "foundations/testing-methods/index.html",
    "foundations/programming-diagnostic/index.html"
  ];
  routes.forEach(function (route) {
    const html = read(route);
    assert.match(html, /supabase-config\.js/);
    assert.match(html, /supabase-client\.js/);
    assert.match(html, /supabase-auth\.js/);
    assert.match(html, /supabase-learning-api\.js/);
    assert.match(html, /learning-api\.js/);
  });
  const config = read("js/config/supabase-config.js");
  assert.match(config, /backend:\s*"supabase"/);
  assert.match(config, /foundations-problem-decomposition/);
  assert.match(config, /foundations-data-design/);
  assert.match(config, /foundations-testing-methods/);
  assert.match(config, /foundations-programming-diagnostic/);
  assert.doesNotMatch(config, /sb_secret_|service_role|SUPABASE_DB_PASSWORD|postgresql:\/\//i);
});

test("LearningApi defaults to Supabase and only uses Apps Script in explicit rollback mode", function () {
  const runtime = context({
    SUPABASE_CONFIG: { backend: "supabase" },
    SupabaseLearningApi: {
      canSubmit: function () { return true; },
      submitResult: function () { return Promise.resolve({}); }
    },
    STUDENT_API_CONFIG: { apiUrl: "https://legacy.example/exec" },
    StudentContext: { getStudentId: function () { return "SYNTH-0001"; } }
  });
  run(runtime.context, "js/core/learning-api.js");
  const result = { activityId: "foundations-data-design" };
  assert.equal(runtime.window.LearningApi.modeFor(result), "supabase");

  const rollback = context({
    SUPABASE_CONFIG: { backend: "apps-script" },
    SupabaseLearningApi: { canSubmit: function () { return true; } },
    STUDENT_API_CONFIG: { apiUrl: "https://legacy.example/exec" },
    StudentContext: { getStudentId: function () { return "SYNTH-0001"; } }
  });
  run(rollback.context, "js/core/learning-api.js");
  assert.equal(rollback.window.LearningApi.modeFor(result), "legacy");
});

test("Supabase submission preserves heterogeneous evidence and programming language", async function () {
  const requests = [];
  const runtime = context({
    SUPABASE_CONFIG: {
      backend: "supabase",
      projectUrl: "https://hubwpkrqndorznwzvaer.supabase.co",
      publishableKey: "sb_publishable_test",
      enabledActivities: ["foundations-programming-diagnostic"]
    },
    SupabaseClient: {
      isConfigured: function () { return true; },
      hasSession: function () { return true; },
      request: function (url, options) {
        requests.push({ url, options });
        return Promise.resolve([{
          client_attempt_id: "programming-synthetic-1",
          activity_key: "foundations-programming-diagnostic",
          attempt_number: 1,
          score: 3,
          max_score: 3,
          received_at: "2026-08-09T12:00:00.000Z",
          idempotent: false
        }]);
      }
    },
    SupabaseAuth: { isAuthenticated: function () { return true; } },
    location: { pathname: "/foundations/programming-diagnostic/" }
  });
  run(runtime.context, "js/core/supabase-learning-api.js");
  await runtime.window.SupabaseLearningApi.submitResult({
    activityId: "foundations-programming-diagnostic",
    activityVersion: "2.0.0",
    attemptId: "programming-synthetic-1",
    startedAt: "2026-08-09T11:55:00.000Z",
    completedAt: "2026-08-09T12:00:00.000Z",
    programmingLanguage: "python",
    responses: [
      { questionId: "FOUND-PROG-001", response: "3", correct: true, score: 1 },
      { questionId: "FOUND-PROG-002", response: ["a", "b"], correct: true, score: 1 },
      { questionId: "FOUND-PROG-003", response: { source: "print(3)" }, correct: true, score: 1 }
    ]
  });
  const body = JSON.parse(requests[0].options.body);
  assert.equal(body.p_programming_language, "python");
  assert.deepEqual(body.p_responses.map(function (item) { return item.response_payload; }), [
    "3", ["a", "b"], { source: "print(3)" }
  ]);
  assert.doesNotMatch(JSON.stringify(body), /student_id|enrolment_id|assignment_id|attempt_number|service_role/i);
});

test("analytics service exposes only API view calls", async function () {
  const calls = [];
  const runtime = context({
    SupabaseClient: {
      request: function (url, options) {
        calls.push({ url, options });
        return Promise.resolve([]);
      }
    }
  });
  run(runtime.context, "js/core/supabase-analytics.js");
  await runtime.window.SupabaseAnalytics.studentProgress();
  await runtime.window.SupabaseAnalytics.teacherAnalytics();
  assert.equal(calls.length, 10);
  assert.ok(calls.every(function (call) {
    return call.url.indexOf("/rest/v1/") === 0 && call.options.schema === "api";
  }));
  assert.equal(calls.some(function (call) { return call.url.indexOf("/learning/") !== -1; }), false);
  assert.equal(calls.some(function (call) { return call.url.indexOf("teacher_group_question_analytics") !== -1; }), true);
});

test("Supabase Auth context does not promote a legacy student session", function () {
  const legacy = JSON.stringify({ studentId: "LEGACY-001" });
  const runtime = context({
    SUPABASE_CONFIG: { backend: "supabase" },
    SupabaseAuth: {
      subscribe: function (listener) { listener({ profile: null }); return function () {}; },
      getLearnerContext: function () { return null; }
    },
    StudentSession: {
      getStudentSession: function () { return JSON.parse(legacy); },
      saveStudentSession: function () { throw new Error("legacy session must not be used"); }
    }
  });
  run(runtime.context, "js/core/student-context.js");
  assert.equal(runtime.window.StudentContext.getCurrentStudent(), null);
  assert.equal(runtime.window.StudentContext.getStudentId(), null);
});
