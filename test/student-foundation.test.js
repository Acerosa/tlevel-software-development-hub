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
  const context = vm.createContext({ window, document: window.document, console, Object, Promise });
  vm.runInContext(read(file), context, { filename: file });
  return window;
}

function learnerRuntime(initialState) {
  let listener;
  let context = initialState && initialState.context || null;
  const calls = [];
  const auth = {
    signIn(email, password) { calls.push(["signIn", email, password]); return Promise.resolve({}); },
    signUp(email, password) { calls.push(["signUp", email, password]); return Promise.resolve({ needsConfirmation: false }); },
    signOut() { calls.push(["signOut"]); return Promise.resolve(true); }
  };
  const learner = {
    subscribe(next) { listener = next; next(initialState || { status: "signed-out", context: null }); return function () {}; },
    refresh() { calls.push(["refresh"]); return Promise.resolve({ status: context ? "authenticated" : "onboarding-required" }); },
    getContext() { return context; }
  };
  const window = { LearningPlatform: { platform: { auth, learner } } };
  run(window, "js/core/student-context.js");
  return {
    window,
    calls,
    publish(state) { context = state.context || null; listener(state); },
    setContext(next) { context = next; }
  };
}

test("hub configuration matches the canonical manifest contracts", function () {
  const window = {};
  run(window, "js/config/app-config.js");
  const manifest = JSON.parse(read("learning-platform-hub.json"));

  assert.equal(window.APP_CONFIG.hubId, manifest.hubId);
  assert.equal(window.APP_CONFIG.hubVersion, manifest.version);
  assert.equal(window.APP_CONFIG.coreVersion, manifest.compatibility.required.coreVersion);
  assert.equal(window.APP_CONFIG.learnerApiContractVersion, manifest.compatibility.required.learnerApiContractVersion);
  assert.equal(window.APP_CONFIG.submissionContractVersion, manifest.compatibility.required.submissionContractVersion);
  assert.deepEqual(
    JSON.parse(JSON.stringify(window.APP_CONFIG.features)),
    manifest.featureFlags
  );
});

test("the composition root creates and initialises exactly one Core platform", async function () {
  let options;
  let initialisations = 0;
  const platform = {
    initialise() { initialisations += 1; return Promise.resolve({ status: "signed-out" }); }
  };
  const window = {
    APP_CONFIG: {
      hubId: "tlevel-software-development",
      siteName: "T Level Digital Software Development Hub",
      coreVersion: "0.1.0",
      navigation: [{ id: "home", label: "Home", path: "" }],
      features: { authentication: true },
      theme: { primary: "#006477", accent: "#00839a" }
    },
    SUPABASE_CONFIG: {
      projectUrl: "https://example.supabase.co",
      publishableKey: "sb_publishable_example"
    },
    LearningPlatformCore: {
      createPlatform(value) { options = value; return platform; }
    }
  };

  run(window, "js/core/platform.js");
  await window.LearningPlatform.ready;

  assert.equal(initialisations, 1);
  assert.equal(options.hubCode, "tlevel-software-development");
  assert.equal(options.navigation[0].path, "./");
  assert.equal(options.supabase.publishableKey, "sb_publishable_example");
  assert.equal(window.LearningPlatform.platform, platform);
});

test("StudentContext exposes a frozen backend-derived learner profile", function () {
  const runtime = learnerRuntime({
    status: "authenticated",
    context: {
      studentNumber: "00012345",
      firstName: "Sam",
      surname: "Taylor",
      fullName: "Sam Taylor",
      displayName: "Sam",
      contactEmail: "sam@example.invalid",
      yearGroup: "Year 1",
      academicYear: "2026/27",
      groupCode: "SD-A",
      groupName: "Software A",
      enrolments: [{ status: "active" }]
    }
  });

  const student = runtime.window.StudentContext.getCurrentStudent();
  assert.equal(student.studentId, "00012345");
  assert.equal(student.fullName, "Sam Taylor");
  assert.equal(student.groupCode, "SD-A");
  assert.equal(Object.isFrozen(student), true);
  assert.equal(runtime.window.StudentContext.isSignedIn(), true);
});

test("StudentContext sign-in delegates to Core Auth and refreshes learner context", async function () {
  const runtime = learnerRuntime();
  runtime.setContext({
    studentNumber: "SYN-001",
    firstName: "Synthetic",
    surname: "Learner",
    fullName: "Synthetic Learner",
    displayName: "Synthetic",
    groupCode: "SD-A",
    enrolments: []
  });

  const student = await runtime.window.StudentContext.signInWithPassword("learner@example.invalid", "password123");
  assert.deepEqual(runtime.calls.slice(0, 2), [
    ["signIn", "learner@example.invalid", "password123"],
    ["refresh"]
  ]);
  assert.equal(student.studentId, "SYN-001");
});

test("StudentContext clears display state on Core sign-out", async function () {
  const runtime = learnerRuntime({
    status: "authenticated",
    context: { studentNumber: "SYN-001", firstName: "Synthetic", enrolments: [] }
  });
  await runtime.window.StudentContext.signOut();
  assert.equal(runtime.window.StudentContext.getCurrentStudent(), null);
  assert.equal(runtime.window.StudentContext.isSignedIn(), false);
  assert.deepEqual(runtime.calls, [["signOut"]]);
});

test("shared account UI composes Core Auth, learner context, and onboarding", function () {
  const source = read("js/core/student-ui.js");
  const hook = read("src/hooks/useHubPlatform.ts");
  const styles = read("css/main.css") + read("css/hub.css");
  assert.match(source, /core\.createAccountDialog/);
  assert.match(source, /authService:\s*platform\.auth/);
  assert.match(source, /learnerContext:\s*platform\.learner/);
  assert.match(source, /onboardingService:\s*platform\.onboarding/);
  assert.match(hook, /createAccountDialog/);
  assert.match(hook, /authService:\s*platform\.auth/);
  assert.doesNotMatch(source, /localStorage|accessToken|refreshToken|studentId\s*:/);
  assert.match(styles, /\.lp-form__field\[hidden\][\s\S]*display:\s*none\s*!important/);
});

test("LearningApi is a Supabase-only compatibility facade", async function () {
  const calls = [];
  const window = {
    SupabaseLearningApi: {
      canSubmit(result) { calls.push(["canSubmit", result]); return true; },
      submitResult(result) { calls.push(["submitResult", result]); return Promise.resolve({ ok: true }); }
    },
    SupabaseAnalytics: {
      studentProgress() { calls.push(["progress"]); return Promise.resolve({ activities: [] }); }
    }
  };
  run(window, "js/core/learning-api.js");

  const result = { activityId: "foundations-data-design" };
  assert.equal(window.LearningApi.modeFor(result), "supabase");
  assert.equal(window.LearningApi.canSubmit(result), true);
  assert.deepEqual(await window.LearningApi.submitResult(result), { ok: true });
  assert.deepEqual(await window.LearningApi.getProgress(), { activities: [] });
  assert.doesNotMatch(read("js/core/learning-api.js"), /apps-script|script\.google|studentId/i);
});
