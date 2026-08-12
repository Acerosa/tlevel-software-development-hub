const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const coreAsset = "vendor/learning-platform-core/0.1.0/learning-platform-core.iife.js";

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function loadCore() {
  const sandbox = { console, URL, Date, setTimeout, clearTimeout };
  vm.createContext(sandbox);
  vm.runInContext(read(coreAsset), sandbox, { filename: coreAsset });
  return sandbox.LearningPlatformCore;
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

test("the vendored Core asset is the reviewed 0.1.0 build", function () {
  const hash = crypto.createHash("sha256").update(read(coreAsset)).digest("hex");
  assert.equal(hash, "87a940431dc981af4aeb65d4c0a4c215c497346b0ce5a10d996261f0f1be44ed");
  assert.match(read("vendor/learning-platform-core/0.1.0/PROVENANCE.md"), /f484b2d/);
  assert.equal(fs.existsSync(path.join(root, "vendor/learning-platform-core/0.1.0/LICENSE")), true);
});

test("the Core browser global exposes platform, onboarding, theme, and UI contracts", function () {
  const core = loadCore();
  [
    "createPlatform",
    "createAuthService",
    "createLearnerContext",
    "createOnboardingService",
    "createAccountDialog",
    "createThemeService",
    "createLoadingState",
    "createErrorBanner"
  ].forEach(function (name) {
    assert.equal(typeof core[name], "function", name + " must be available");
  });
});

test("Core Auth restores and clears the SDK-owned session", async function () {
  const core = loadCore();
  const session = { user: { id: "auth-user-1" }, access_token: "not-persisted-by-hub" };
  let authListener;
  let signedOut = false;
  const service = core.createAuthService({
    client: {
      auth: {
        onAuthStateChange(listener) { authListener = listener; return { data: { subscription: { unsubscribe() {} } } }; },
        getSession() { return Promise.resolve({ data: { session }, error: null }); },
        signOut() { signedOut = true; return Promise.resolve({ error: null }); }
      }
    },
    logger: { warn() {} }
  });

  await service.initialise();
  assert.equal(service.isSignedIn(), true);
  assert.equal(service.getSession(), session);
  authListener("SIGNED_OUT", null);
  assert.equal(service.isSignedIn(), false);
  await service.signOut();
  assert.equal(signedOut, true);
});

test("Core learner context derives profile and active enrolment from API services", async function () {
  const core = loadCore();
  let authSubscriber;
  const authService = {
    isSignedIn() { return true; },
    initialise() { return Promise.resolve(); },
    subscribe(listener) { authSubscriber = listener; return function () {}; }
  };
  const learner = core.createLearnerContext({
    authService,
    profileService: {
      getProfile() {
        return Promise.resolve({
          student_number: "00012345",
          first_name: "Sam",
          surname: "Taylor",
          display_name: "Sam",
          contact_email: "sam@example.invalid"
        });
      }
    },
    enrolmentService: {
      getEnrolments() {
        return Promise.resolve([{ status: "active", group_code: "SD-A", group_name: "Software A", year_group: "Year 1" }]);
      }
    }
  });

  authSubscriber({ status: "authenticated" });
  await learner.refresh();
  const context = learner.getContext();
  assert.equal(context.studentNumber, "00012345");
  assert.equal(context.fullName, "Sam Taylor");
  assert.equal(context.groupCode, "SD-A");
});

test("Core onboarding stores only safe pending fields and uses controlled RPC inputs", async function () {
  const core = loadCore();
  const storage = memoryStorage();
  const calls = [];
  const onboarding = core.createOnboardingService({
    api: {
      getRegistrationOptions() {
        return Promise.resolve([{ registration_option: "option-1", year_group: "Year 1", group_code: "SD-A" }]);
      },
      completeOnboarding(payload) { calls.push(payload); return Promise.resolve([{ student_number: "00012345" }]); }
    },
    authService: { isSignedIn() { return true; } },
    learnerContext: { refresh() { return Promise.resolve(); } },
    storage,
    pendingKey: "pending-test"
  });

  onboarding.savePending({
    firstName: "Sam",
    surname: "Taylor",
    studentNumber: "00012345",
    registrationKey: "option-1",
    password: "must-not-be-stored",
    email: "must-not-be-stored@example.invalid"
  });
  const pending = JSON.parse(storage.getItem("pending-test"));
  assert.deepEqual(Object.keys(pending).sort(), ["firstName", "registrationKey", "studentNumber", "surname"]);

  const options = await onboarding.getRegistrationOptions();
  assert.equal(options[0].registrationKey, "option-1");
  await onboarding.complete({ firstName: "Sam", surname: "Taylor", studentNumber: "00012345" }, "option-1");
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), {
    p_first_name: "Sam",
    p_surname: "Taylor",
    p_student_number: "00012345",
    p_registration_option: "option-1"
  });
  assert.equal(storage.getItem("pending-test"), null);
});

test("Core onboarding refuses anonymous completion", async function () {
  const core = loadCore();
  const onboarding = core.createOnboardingService({
    api: {},
    authService: { isSignedIn() { return false; } },
    storage: memoryStorage()
  });
  await assert.rejects(
    Promise.resolve().then(function () { return onboarding.getRegistrationOptions(); }),
    function (error) { return error.code === "AUTH_REQUIRED"; }
  );
});

test("Core secure submission rejects browser identity and score fields", function () {
  const core = loadCore();
  assert.throws(function () {
    core.assertSecureSubmission({ activityKey: "activity", learnerId: "learner" });
  }, function (error) { return error.code === "FORBIDDEN_SUBMISSION_FIELD"; });
  assert.throws(function () {
    core.assertSecureSubmission({ activityKey: "activity", score: 10 });
  }, function (error) { return error.code === "FORBIDDEN_SUBMISSION_FIELD"; });
});

test("hub modules contain no parallel Auth client or token persistence", function () {
  const source = fs.readdirSync(path.join(root, "js/core"))
    .filter(function (file) { return file.endsWith(".js"); })
    .map(function (file) { return read("js/core/" + file); })
    .join("\n");
  assert.equal(fs.existsSync(path.join(root, "js/core/supabase-client.js")), false);
  assert.equal(fs.existsSync(path.join(root, "js/core/supabase-auth.js")), false);
  assert.equal((source.match(/createClient\s*\(/g) || []).length, 0);
  assert.doesNotMatch(source, /refreshToken|accessToken|sessionStorageKey/);
});
