const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function runScript(context, relativePath) {
  vm.runInContext(read(relativePath), context, {
    filename: path.join(projectRoot, relativePath)
  });
}

function createStorage(initialValues) {
  const values = new Map(Object.entries(initialValues || {}));
  return {
    getItem: function (key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem: function (key, value) {
      values.set(key, String(value));
    },
    removeItem: function (key) {
      values.delete(key);
    },
    value: function (key) {
      return values.get(key);
    }
  };
}

function createContext(windowOverrides) {
  const browserWindow = Object.assign({
    setTimeout,
    clearTimeout,
    location: { pathname: "/foundations/requirements-classification/" }
  }, windowOverrides || {});
  return {
    window: browserWindow,
    context: vm.createContext({
      window: browserWindow,
      AbortController,
      console,
      setTimeout,
      clearTimeout
    })
  };
}

function jsonResponse(payload, ok = true, status = 200) {
  return {
    ok,
    status,
    text: async function () { return JSON.stringify(payload); }
  };
}

function configuredRuntime(fetchImplementation, storage) {
  const runtime = createContext({
    SUPABASE_CONFIG: {
      projectUrl: "https://hubwpkrqndorznwzvaer.supabase.co",
      publishableKey: "sb_publishable_browser_test_key",
      requestTimeoutMs: 100,
      sessionStorageKey: "tlevel.softwareDevelopment.supabaseAuthSession.v1",
      enabledActivities: ["foundations-requirements-classification"]
    },
    localStorage: storage || createStorage(),
    fetch: fetchImplementation
  });
  runScript(runtime.context, "js/core/supabase-client.js");
  return runtime;
}

test("the browser config has only public fields and enables Requirements first", function () {
  const runtime = createContext();
  runScript(runtime.context, "js/config/supabase-config.js");
  const config = runtime.window.SUPABASE_CONFIG;

  assert.deepEqual(Array.from(Object.keys(config)).sort(), [
    "backend",
    "enabledActivities",
    "projectUrl",
    "publishableKey",
    "requestTimeoutMs",
    "sessionStorageKey"
  ]);
  assert.equal(config.backend, "supabase");
  assert.equal(config.projectUrl, "https://hubwpkrqndorznwzvaer.supabase.co");
  assert.match(config.publishableKey, /^sb_publishable_/);
  assert.deepEqual(Array.from(config.enabledActivities), [
    "foundations-requirements-classification",
    "foundations-problem-decomposition",
    "foundations-data-design",
    "foundations-testing-methods",
    "foundations-programming-diagnostic"
  ]);
  assert.doesNotMatch(read("js/config/supabase-config.js"), /service_role|sb_secret_/i);

  const requirementsPage = read("foundations/requirements-classification/index.html");
  const scripts = [
    "supabase-config.js",
    "supabase-client.js",
    "supabase-auth.js",
    "supabase-learning-api.js",
    "learning-api.js"
  ];
  scripts.reduce(function (previousIndex, script) {
    const index = requirementsPage.indexOf(script);
    assert.ok(index > previousIndex, script + " must load in dependency order");
    return index;
  }, -1);

  [
    "foundations/problem-decomposition/index.html",
    "foundations/data-design/index.html",
    "foundations/testing-methods/index.html",
    "foundations/programming-diagnostic/index.html"
  ].forEach(function (page) {
    assert.match(read(page), /supabase-(?:config|client|auth|learning-api|analytics)\.js/);
  });
});

test("password sign-in stores a separate Supabase session and reads a safe profile", async function () {
  const legacyKey = "tlevel.softwareDevelopment.studentSession.v1";
  const supabaseKey = "tlevel.softwareDevelopment.supabaseAuthSession.v1";
  const legacyValue = JSON.stringify({ studentId: "00123456", displayName: "Legacy" });
  const storage = createStorage({ [legacyKey]: legacyValue });
  const requests = [];
  const runtime = configuredRuntime(async function (url, options) {
    requests.push({ url, options });
    if (url.includes("/auth/v1/token")) {
      return jsonResponse({
        access_token: "synthetic-access-token",
        refresh_token: "synthetic-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: "10000000-0000-4000-8000-000000000001" }
      });
    }
    return jsonResponse([{
      student_number: "SYN-001",
      first_name: "Synthetic",
      display_name: "Synthetic Student"
    }]);
  }, storage);
  runScript(runtime.context, "js/core/supabase-auth.js");

  const profile = await runtime.window.SupabaseAuth.signInWithPassword(
    "synthetic.student@example.test",
    "temporary-password"
  );

  assert.deepEqual(JSON.parse(JSON.stringify(profile)), {
    studentNumber: "SYN-001",
    firstName: "Synthetic",
    displayName: "Synthetic Student"
  });
  assert.equal(requests.length, 3);
  assert.match(requests[0].url, /\/auth\/v1\/token\?grant_type=password$/);
  assert.equal(requests[0].options.headers.apikey, "sb_publishable_browser_test_key");
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    email: "synthetic.student@example.test",
    password: "temporary-password"
  });
  assert.match(requests[1].url, /\/rest\/v1\/my_profile\?/);
  assert.equal(requests[1].options.headers.Authorization, "Bearer synthetic-access-token");
  assert.equal(requests[1].options.headers["Accept-Profile"], "api");
  assert.equal(requests[1].options.headers["Content-Profile"], "api");
  assert.match(requests[2].url, /\/rest\/v1\/my_enrolments\?/);
  assert.equal(storage.value(legacyKey), legacyValue);
  assert.equal(JSON.parse(storage.value(supabaseKey)).userId,
    "10000000-0000-4000-8000-000000000001");
});

test("legacy student state is never converted into a Supabase Auth session", async function () {
  let requestCount = 0;
  const storage = createStorage({
    "tlevel.softwareDevelopment.studentSession.v1": JSON.stringify({
      studentId: "00123456"
    })
  });
  const runtime = configuredRuntime(async function () {
    requestCount += 1;
    throw new Error("fetch must not run");
  }, storage);
  runScript(runtime.context, "js/core/supabase-auth.js");

  assert.equal(runtime.window.SupabaseAuth.hasSession(), false);
  assert.equal(await runtime.window.SupabaseAuth.restoreProfile(), null);
  assert.equal(requestCount, 0);
  assert.equal(storage.value("tlevel.softwareDevelopment.supabaseAuthSession.v1"), undefined);
});

test("Requirements submits rich evidence without browser-owned identity or totals", async function () {
  const sessionKey = "tlevel.softwareDevelopment.supabaseAuthSession.v1";
  const storage = createStorage({
    [sessionKey]: JSON.stringify({
      accessToken: "synthetic-access-token",
      refreshToken: "synthetic-refresh-token",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      userId: "10000000-0000-4000-8000-000000000001"
    })
  });
  let capturedRequest;
  const runtime = configuredRuntime(async function (url, options) {
    capturedRequest = { url, options };
    return jsonResponse([{
      client_attempt_id: "requirements-attempt-1",
      activity_key: "foundations-requirements-classification",
      attempt_number: 1,
      score: 4,
      max_score: 6,
      received_at: "2026-08-09T12:00:00.000Z",
      idempotent: false
    }]);
  }, storage);
  runScript(runtime.context, "js/core/supabase-learning-api.js");

  const submission = await runtime.window.SupabaseLearningApi.submitResult({
    activityId: "foundations-requirements-classification",
    activityVersion: "1.0.0",
    attemptId: "requirements-attempt-1",
    startedAt: "2026-08-09T11:55:00.000Z",
    completedAt: "2026-08-09T12:00:00.000Z",
    score: 999,
    maxScore: 999,
    responses: [
      { questionId: "q-string", response: "functional", correct: true, score: 1 },
      { questionId: "q-array", response: ["a", "b"], correct: true, score: 2 },
      { questionId: "q-object", response: { requirement: "secure" }, correct: false, score: 1 }
    ]
  });
  const body = JSON.parse(capturedRequest.options.body);

  assert.match(capturedRequest.url, /\/rest\/v1\/rpc\/submit_attempt$/);
  assert.equal(capturedRequest.options.headers["Accept-Profile"], "api");
  assert.equal(capturedRequest.options.headers.Authorization, "Bearer synthetic-access-token");
  assert.deepEqual(body, {
    p_activity_key: "foundations-requirements-classification",
    p_activity_version: "1.0.0",
    p_client_attempt_id: "requirements-attempt-1",
    p_responses: [
      {
        question_id: "q-string",
        response_payload: "functional",
        awarded_score: 1,
        is_correct: true
      },
      {
        question_id: "q-array",
        response_payload: ["a", "b"],
        awarded_score: 2,
        is_correct: true
      },
      {
        question_id: "q-object",
        response_payload: { requirement: "secure" },
        awarded_score: 1,
        is_correct: false
      }
    ],
    p_source_page: "/foundations/requirements-classification/",
    p_started_at: "2026-08-09T11:55:00.000Z",
    p_completed_at: "2026-08-09T12:00:00.000Z",
    p_programming_language: null
  });
  assert.equal(Object.prototype.hasOwnProperty.call(body, "student_id"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(body, "score"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(body, "max_score"), false);
  assert.equal(submission.score, 4);
  assert.equal(submission.maxScore, 6);
});

test("a Supabase submission failure never falls through to Apps Script", async function () {
  let legacyRequestCount = 0;
  let supabaseRequestCount = 0;
  const runtime = createContext({
    STUDENT_API_CONFIG: { apiUrl: "https://example.test/exec", requestTimeoutMs: 100 },
    StudentContext: { getStudentId: function () { return "00123456"; } },
    SupabaseLearningApi: {
      canSubmit: function () { return true; },
      submitResult: function () {
        supabaseRequestCount += 1;
        const error = new Error("synthetic Supabase failure");
        error.code = "NETWORK_ERROR";
        return Promise.reject(error);
      }
    },
    fetch: async function () {
      legacyRequestCount += 1;
      throw new Error("legacy request must not run");
    }
  });
  runScript(runtime.context, "js/core/learning-api.js");

  await assert.rejects(
    runtime.window.LearningApi.submitResult({ activityId: "anything" }),
    function (error) { return error.code === "NETWORK_ERROR"; }
  );
  assert.equal(runtime.window.LearningApi.modeFor({ activityId: "anything" }), "supabase");
  assert.equal(supabaseRequestCount, 1);
  assert.equal(legacyRequestCount, 0);
});

test("non-enabled activities retain the narrow legacy Apps Script contract", async function () {
  let capturedRequest;
  const runtime = createContext({
    STUDENT_API_CONFIG: { apiUrl: "https://example.test/exec", requestTimeoutMs: 100 },
    StudentContext: { getStudentId: function () { return "00123456"; } },
    SupabaseLearningApi: {
      canSubmit: function () { return false; },
      submitResult: function () { throw new Error("Supabase must not run"); }
    },
    location: { pathname: "/foundations/testing-methods/" },
    fetch: async function (url, options) {
      capturedRequest = { url, options };
      return jsonResponse({
        success: true,
        data: { submission: {
          attemptId: "testing-attempt-1",
          activityId: "foundations-testing-methods",
          attemptNumber: 1,
          score: 3,
          maxScore: 4,
          percentage: 75,
          status: "completed",
          submittedAt: "2026-08-09T12:00:00.000Z",
          duplicate: false
        } }
      });
    }
  });
  runScript(runtime.context, "js/core/learning-api.js");

  await runtime.window.LearningApi.submitResult({
    activityId: "foundations-testing-methods",
    activityVersion: "1.0.0",
    attemptId: "testing-attempt-1",
    score: 3,
    maxScore: 4,
    responses: [{ private: "not sent to the legacy endpoint" }]
  });

  assert.equal(runtime.window.LearningApi.modeFor({
    activityId: "foundations-testing-methods"
  }), "legacy");
  assert.equal(capturedRequest.url, "https://example.test/exec");
  assert.deepEqual(JSON.parse(capturedRequest.options.body).result, {
    activityId: "foundations-testing-methods",
    activityVersion: "1.0.0",
    attemptId: "testing-attempt-1",
    score: 3,
    maxScore: 4
  });
});
