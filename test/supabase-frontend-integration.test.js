const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const coreAsset = "vendor/learning-platform-core/0.2.0/learning-platform-core.iife.js";

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

test("the vendored Core asset is the reviewed 0.2.0 build", function () {
  const hash = crypto.createHash("sha256").update(read(coreAsset)).digest("hex");
  assert.equal(hash, "c48398fafb34e36c42fd7733f07eaf4d388f20efce72ba35de295c6cb2a15761");
  assert.match(read("vendor/learning-platform-core/0.2.0/PROVENANCE.md"), /curriculum-runtime/);
  assert.equal(fs.existsSync(path.join(root, "vendor/learning-platform-core/0.2.0/LICENSE")), true);
});

test("the Core browser global exposes the 0.2.0 stable contract", function () {
  const core = loadCore();
  [
    "createPlatform",
    "createAccountDialog",
    "createThemeService",
    "createLoadingState",
    "createErrorBanner"
  ].forEach(function (name) {
    assert.equal(typeof core[name], "function", name + " must be available");
  });
});

function fakeClient(session) {
  return {
    auth: {
      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
      getSession() { return Promise.resolve({ data: { session }, error: null }); },
      signOut() { return Promise.resolve({ error: null }); }
    },
    schema() {
      return {
        from() {
          return {
            select() { return this; },
            eq() { return this; },
            order() { return this; },
            then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); }
          };
        },
        rpc() { return Promise.resolve({ data: [], error: null }); }
      };
    }
  };
}

test("Core Auth restores and clears the SDK-owned session", async function () {
  const core = loadCore();
  const session = { user: { id: "auth-user-1" }, access_token: "not-persisted-by-hub" };
  const platform = core.createPlatform({
    hubCode: "tlevel-software-development",
    hubName: "T Level Digital Software Development Hub",
    supabase: {
      projectUrl: "https://example.supabase.co",
      publishableKey: "sb_publishable_example"
    }
  }, { supabaseClient: fakeClient(session), document: null, window: null });
  await platform.initialise();
  assert.equal(platform.auth.isSignedIn(), true);
  assert.equal(platform.auth.getSession(), session);
  await platform.auth.signOut();
  assert.equal(platform.auth.isSignedIn(), false);
  platform.destroy();
});

test("Core learner context is exposed through the platform facade", async function () {
  const core = loadCore();
  const platform = core.createPlatform({
    hubCode: "tlevel-software-development",
    hubName: "T Level Digital Software Development Hub",
    supabase: {
      projectUrl: "https://example.supabase.co",
      publishableKey: "sb_publishable_example"
    }
  }, {
    supabaseClient: {
      auth: {
        onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
        getSession() {
          return Promise.resolve({
            data: { session: { user: { id: "auth-user-1" }, access_token: "managed" } },
            error: null
          });
        },
        signOut() { return Promise.resolve({ error: null }); }
      },
      schema() {
        return {
          from(view) {
            const data = view === "my_profile"
              ? [{ student_number: "00012345", first_name: "Sam", surname: "Taylor", display_name: "Sam" }]
              : view === "my_enrolments"
                ? [{ status: "active", group_code: "SD-A", group_name: "Software A", year_group: "Year 1" }]
                : [];
            return {
              select() { return this; },
              eq() { return this; },
              order() { return this; },
              then(resolve) { return Promise.resolve({ data, error: null }).then(resolve); }
            };
          },
          rpc() { return Promise.resolve({ data: [], error: null }); }
        };
      }
    },
    document: null,
    window: null
  });
  await platform.initialise();
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  const context = platform.learner.getContext();
  assert.equal(context.studentNumber, "00012345");
  assert.equal(context.fullName, "Sam Taylor");
  assert.equal(context.groupCode, "SD-A");
  platform.destroy();
});

test("Core onboarding stores only safe pending fields", function () {
  const core = loadCore();
  const storage = memoryStorage();
  const platform = core.createPlatform({
    hubCode: "tlevel-software-development",
    hubName: "T Level Digital Software Development Hub",
    supabase: {
      projectUrl: "https://example.supabase.co",
      publishableKey: "sb_publishable_example"
    }
  }, { supabaseClient: fakeClient(null), sessionStorage: storage, document: null, window: null });
  platform.onboarding.savePending({
    firstName: "Sam",
    surname: "Taylor",
    studentNumber: "00012345",
    registrationKey: "option-1",
    password: "must-not-be-stored",
    email: "must-not-be-stored@example.invalid"
  });
  const pending = JSON.parse(storage.getItem("learning-platform.pending-onboarding.v1:tlevel-software-development"));
  assert.deepEqual(Object.keys(pending).sort(), ["firstName", "registrationKey", "studentNumber", "surname"]);
  platform.destroy();
});

test("Core onboarding refuses anonymous completion", async function () {
  const core = loadCore();
  const platform = core.createPlatform({
    hubCode: "tlevel-software-development",
    hubName: "T Level Digital Software Development Hub",
    supabase: {
      projectUrl: "https://example.supabase.co",
      publishableKey: "sb_publishable_example"
    }
  }, { supabaseClient: fakeClient(null), sessionStorage: memoryStorage(), document: null, window: null });
  await assert.rejects(
    Promise.resolve().then(function () { return platform.onboarding.getRegistrationOptions(); }),
    function (error) { return error.code === "AUTH_REQUIRED"; }
  );
  platform.destroy();
});

test("Core secure submission rejects browser identity and score fields", async function () {
  const core = loadCore();
  const platform = core.createPlatform({
    hubCode: "tlevel-software-development",
    hubName: "T Level Digital Software Development Hub",
    supabase: {
      projectUrl: "https://example.supabase.co",
      publishableKey: "sb_publishable_example"
    }
  }, { supabaseClient: fakeClient({ user: { id: "auth-user-1" }, access_token: "managed" }), document: null, window: null });
  await assert.rejects(
    platform.submission.submit({ activityKey: "activity", learnerId: "learner", responses: [] }),
    function (error) { return error.code === "FORBIDDEN_SUBMISSION_FIELD"; }
  );
  await assert.rejects(
    platform.submission.submit({ activityKey: "activity", score: 10, responses: [] }),
    function (error) { return error.code === "FORBIDDEN_SUBMISSION_FIELD"; }
  );
  platform.destroy();
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
