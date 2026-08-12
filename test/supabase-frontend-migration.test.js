const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function run(window, file) {
  const context = vm.createContext({ window, console, Promise, Object, Array, JSON });
  vm.runInContext(read(file), context, { filename: file });
  return window;
}

test("all Foundations routes load pinned Core before hub compatibility adapters", function () {
  [
    "foundations/requirements-classification/index.html",
    "foundations/problem-decomposition/index.html",
    "foundations/data-design/index.html",
    "foundations/testing-methods/index.html",
    "foundations/programming-diagnostic/index.html"
  ].forEach(function (route) {
    const html = read(route);
    const indexes = [
      html.indexOf("@supabase/supabase-js@2.112.3"),
      html.indexOf("learning-platform-core.iife.js"),
      html.indexOf("platform.js"),
      html.indexOf("student-context.js"),
      html.indexOf("supabase-learning-api.js"),
      html.indexOf("learning-api.js"),
      html.indexOf("activity-engine.js")
    ];
    assert.ok(indexes.every(function (index) { return index >= 0; }), route + " is missing an integration asset");
    assert.deepEqual(indexes.slice().sort(function (a, b) { return a - b; }), indexes, route + " has an invalid load order");
  });
});

test("the submission bridge preserves required evidence and programming language", async function () {
  const calls = [];
  const client = {
    schema(schema) {
      assert.equal(schema, "api");
      return {
        rpc(name, payload) {
          calls.push({ name, payload });
          return Promise.resolve({
            data: [{
              client_attempt_id: "programming-synthetic-1",
              activity_key: "foundations-programming-diagnostic",
              attempt_number: 1,
              score: 3,
              max_score: 3,
              received_at: "2026-08-09T12:00:00.000Z",
              idempotent: false
            }],
            error: null
          });
        }
      };
    }
  };
  const window = {
    SUPABASE_CONFIG: {
      projectUrl: "https://example.supabase.co",
      publishableKey: "sb_publishable_example",
      enabledActivities: ["foundations-programming-diagnostic"]
    },
    LearningPlatform: { platform: { client, auth: { isSignedIn() { return true; } } } },
    location: { pathname: "/foundations/programming-diagnostic/" }
  };
  run(window, "js/core/supabase-learning-api.js");

  const response = await window.SupabaseLearningApi.submitResult({
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

  assert.equal(calls[0].name, "submit_attempt");
  assert.equal(calls[0].payload.p_programming_language, "python");
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[0].payload.p_responses.map(function (item) { return item.response_payload; }))),
    ["3", ["a", "b"], { source: "print(3)" }]
  );
  assert.equal(response.attemptId, "programming-synthetic-1");
  assert.doesNotMatch(JSON.stringify(calls[0].payload), /student_id|learner_id|enrolment_id|assignment_id|attempt_number|total_score|service_role/i);
});

test("the submission bridge refuses anonymous and unsupported activity submissions", async function () {
  const window = {
    SUPABASE_CONFIG: { enabledActivities: ["foundations-data-design"] },
    LearningPlatform: {
      platform: {
        client: { schema() { throw new Error("must not call backend"); } },
        auth: { isSignedIn() { return false; } }
      }
    },
    location: { pathname: "/foundations/data-design/" }
  };
  run(window, "js/core/supabase-learning-api.js");
  await assert.rejects(
    window.SupabaseLearningApi.submitResult({ activityId: "foundations-data-design" }),
    function (error) { return error.code === "VALIDATION_FAILED" || error.code === "AUTHENTICATION_REQUIRED"; }
  );
  assert.equal(window.SupabaseLearningApi.canSubmit({ activityId: "not-enabled" }), false);
});

test("learner analytics delegates to Core progress and assignment services", async function () {
  const calls = [];
  const window = {
    LearningPlatform: {
      platform: {
        progress: {
          getProgress() { calls.push("progress"); return Promise.resolve([{ activity_key: "a" }]); },
          getAttempts() { calls.push("attempts"); return Promise.resolve([{ activity_key: "a" }]); }
        },
        assignment: {
          getAssignments() { calls.push("assignments"); return Promise.resolve([{ activity_key: "a" }]); }
        }
      }
    }
  };
  run(window, "js/core/supabase-analytics.js");
  const result = await window.SupabaseAnalytics.studentProgress();
  assert.deepEqual(calls, ["progress", "attempts", "assignments"]);
  assert.equal(result.activities.length, 1);
  assert.equal(result.attempts.length, 1);
  assert.equal(result.assignments.length, 1);
  assert.doesNotMatch(read("js/core/supabase-analytics.js"), /teacher_group|\.from\(|\/rest\/v1/);
});

test("the obsolete Apps Script and local learner-session compatibility is removed", function () {
  const files = [
    "js/config/student-api-config.js",
    "js/core/student-api.js",
    "js/core/student-session.js",
    "js/core/supabase-client.js",
    "js/core/supabase-auth.js"
  ];
  files.forEach(function (file) {
    assert.equal(fs.existsSync(path.join(root, file)), false, file + " should be removed");
  });
  const activeSource = [
    "js/core/platform.js",
    "js/core/student-context.js",
    "js/core/learning-api.js"
  ].map(read).join("\n");
  assert.doesNotMatch(activeSource, /script\.google\.com|apps-script|StudentSession|refreshToken|accessToken/i);
});

test("the canonical manifest contains only generic LHDS metadata", function () {
  const manifest = JSON.parse(read("learning-platform-hub.json"));
  assert.equal(manifest.manifestVersion, "1.0.0");
  assert.equal(manifest.hubId, "tlevel-software-development");
  assert.equal(manifest.repositoryUrl, "https://github.com/Acerosa/tlevel-software-development-hub");
  assert.equal(manifest.deploymentUrl, "https://acerosa.github.io/tlevel-software-development-hub");
  assert.deepEqual(manifest.courses, ["t-level-digital-software-development"]);
  assert.equal(manifest.compatibility.required.coreVersion, "0.1.0");
  assert.doesNotMatch(JSON.stringify(manifest), /questionBank|week|taskContent|supabaseUrl|publishableKey/i);
});
