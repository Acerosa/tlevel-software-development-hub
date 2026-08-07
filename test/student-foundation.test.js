const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");

function runScript(context, relativePath) {
  const filename = path.join(projectRoot, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  vm.runInContext(source, context, { filename });
}

function createContext(windowOverrides) {
  const browserWindow = Object.assign({
    setTimeout,
    clearTimeout
  }, windowOverrides);
  const context = vm.createContext({
    window: browserWindow,
    AbortController,
    console,
    setTimeout,
    clearTimeout
  });

  return { context, window: browserWindow };
}

function createApiRuntime(fetchImplementation, apiUrl = "https://example.test/exec") {
  const runtime = createContext({
    STUDENT_API_CONFIG: {
      apiUrl,
      requestTimeoutMs: 100,
      sessionStorageKey: "tlevel.softwareDevelopment.studentSession.v1"
    },
    fetch: fetchImplementation
  });

  runScript(runtime.context, "js/core/student-api.js");
  return runtime;
}

function jsonResponse(payload, ok = true) {
  return {
    ok,
    text: async function () {
      return JSON.stringify(payload);
    }
  };
}

function createStorage() {
  const values = new Map();

  return {
    getItem: function (key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem: function (key, value) {
      values.set(key, String(value));
    },
    removeItem: function (key) {
      values.delete(key);
    }
  };
}

function createSessionRuntime(storage) {
  const runtime = createContext({
    STUDENT_API_CONFIG: {
      sessionStorageKey: "tlevel.softwareDevelopment.studentSession.v1"
    },
    localStorage: storage
  });

  runScript(runtime.context, "js/core/student-session.js");
  return runtime;
}

test("empty student IDs are rejected before a request is made", async function () {
  let requestCount = 0;
  const runtime = createApiRuntime(async function () {
    requestCount += 1;
    return jsonResponse({ success: true });
  });

  await assert.rejects(
    runtime.window.StudentApi.getStudent("   "),
    function (error) {
      return error.code === "INVALID_STUDENT_ID";
    }
  );
  assert.equal(requestCount, 0);
});

test("student IDs must be text and are never converted to numbers", async function () {
  const runtime = createApiRuntime(async function () {
    return jsonResponse({ success: true });
  });

  await assert.rejects(
    runtime.window.StudentApi.getStudent(123456),
    function (error) {
      return error.code === "INVALID_STUDENT_ID";
    }
  );
});

test("getStudent sends the correct action and preserves leading zeroes", async function () {
  let capturedRequest;
  const runtime = createApiRuntime(async function (url, options) {
    capturedRequest = { url, options };
    return jsonResponse({
      success: true,
      data: {
        student: {
          studentId: "00123456",
          firstName: "Alex",
          displayName: "Alex Smith",
          group: "TLEVEL-Y2",
          email: "must-not-be-retained@example.test",
          surname: "Smith"
        }
      }
    });
  });

  const student = await runtime.window.StudentApi.getStudent("  00123456  ");
  const requestBody = JSON.parse(capturedRequest.options.body);

  assert.equal(capturedRequest.url, "https://example.test/exec");
  assert.equal(capturedRequest.options.method, "POST");
  assert.equal(capturedRequest.options.headers["Content-Type"], "text/plain;charset=utf-8");
  assert.deepEqual(requestBody, {
    action: "getStudent",
    studentId: "00123456"
  });
  assert.deepEqual(Object.keys(student).sort(), [
    "displayName",
    "firstName",
    "group",
    "studentId"
  ]);
  assert.equal(student.studentId, "00123456");
});

test("backend student errors remain predictable for the interface", async function () {
  for (const code of ["STUDENT_NOT_FOUND", "STUDENT_INACTIVE"]) {
    const runtime = createApiRuntime(async function () {
      return jsonResponse({ success: false, error: code });
    });

    await assert.rejects(
      runtime.window.StudentApi.getStudent("00123456"),
      function (error) {
        return error.code === code;
      }
    );
  }
});

test("network and malformed responses use safe error codes", async function () {
  const networkRuntime = createApiRuntime(async function () {
    throw new Error("private transport details");
  });
  const malformedRuntime = createApiRuntime(async function () {
    return { ok: true, text: async function () { return "not-json"; } };
  });

  await assert.rejects(
    networkRuntime.window.StudentApi.getStudent("00123456"),
    function (error) {
      return error.code === "NETWORK_ERROR";
    }
  );
  await assert.rejects(
    malformedRuntime.window.StudentApi.getStudent("00123456"),
    function (error) {
      return error.code === "INVALID_RESPONSE";
    }
  );
});

test("a missing API URL produces a configuration error", async function () {
  const runtime = createApiRuntime(async function () {
    throw new Error("fetch must not run");
  }, "");

  await assert.rejects(
    runtime.window.StudentApi.getStudent("00123456"),
    function (error) {
      return error.code === "CONFIGURATION_ERROR";
    }
  );
});

test("the session stores only the safe student profile", function () {
  const storage = createStorage();
  const runtime = createSessionRuntime(storage);
  const session = runtime.window.StudentSession.saveStudentSession({
    studentId: "00123456",
    firstName: "Alex",
    displayName: "Alex Smith",
    group: "TLEVEL-Y2",
    email: "must-not-be-stored@example.test",
    surname: "Smith",
    internalData: { row: 25 }
  });
  const stored = JSON.parse(storage.getItem(runtime.window.StudentSession.storageKey));

  assert.deepEqual(Object.keys(stored).sort(), [
    "displayName",
    "firstName",
    "group",
    "signedInAt",
    "studentId"
  ]);
  assert.equal(stored.studentId, "00123456");
  assert.match(session.signedInAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("a valid API profile completes the sign-in session flow", async function () {
  const storage = createStorage();
  const runtime = createContext({
    STUDENT_API_CONFIG: {
      apiUrl: "https://example.test/exec",
      requestTimeoutMs: 100,
      sessionStorageKey: "tlevel.softwareDevelopment.studentSession.v1"
    },
    localStorage: storage,
    fetch: async function () {
      return jsonResponse({
        success: true,
        data: {
          student: {
            studentId: "00123456",
            firstName: "Alex",
            displayName: "Alex Smith",
            group: "TLEVEL-Y2"
          }
        }
      });
    }
  });
  runScript(runtime.context, "js/core/student-session.js");
  runScript(runtime.context, "js/core/student-api.js");
  runScript(runtime.context, "js/core/student-context.js");

  const student = await runtime.window.StudentApi.getStudent("00123456");
  runtime.window.StudentContext.signIn(student);

  assert.equal(runtime.window.StudentContext.isSignedIn(), true);
  assert.equal(runtime.window.StudentContext.getStudentId(), "00123456");
  assert.ok(storage.getItem(runtime.window.StudentSession.storageKey));
});

test("a valid session restores after a fresh page runtime", function () {
  const storage = createStorage();
  const firstRuntime = createSessionRuntime(storage);
  firstRuntime.window.StudentSession.saveStudentSession({
    studentId: "00000007",
    firstName: "Sam",
    displayName: "Sam Jones",
    group: "TLEVEL-Y2"
  });

  const reloadRuntime = createSessionRuntime(storage);
  const restored = reloadRuntime.window.StudentSession.getStudentSession();

  assert.equal(restored.studentId, "00000007");
  assert.equal(restored.firstName, "Sam");
});

test("corrupt session data is discarded without crashing", function () {
  const storage = createStorage();
  const storageKey = "tlevel.softwareDevelopment.studentSession.v1";
  storage.setItem(storageKey, "{broken-json");
  const runtime = createSessionRuntime(storage);

  assert.equal(runtime.window.StudentSession.getStudentSession(), null);
  assert.equal(storage.getItem(storageKey), null);
});

test("global student context signs in, exposes the ID and signs out", function () {
  const storage = createStorage();
  const runtime = createSessionRuntime(storage);
  runScript(runtime.context, "js/core/student-context.js");

  assert.equal(runtime.window.StudentContext.isSignedIn(), false);
  runtime.window.StudentContext.signIn({
    studentId: "00012345",
    firstName: "Taylor",
    displayName: "Taylor Lee",
    group: "TLEVEL-Y2"
  });
  assert.equal(runtime.window.StudentContext.isSignedIn(), true);
  assert.equal(runtime.window.StudentContext.getStudentId(), "00012345");
  assert.equal(Object.isFrozen(runtime.window.StudentContext.getCurrentStudent()), true);

  runtime.window.StudentContext.signOut();
  assert.equal(runtime.window.StudentContext.isSignedIn(), false);
  assert.equal(runtime.window.StudentContext.getCurrentStudent(), null);
  assert.equal(storage.getItem(runtime.window.StudentSession.storageKey), null);
});

test("student-facing messages cover not found, inactive and network errors", function () {
  const runtime = createContext({
    AppUtils: { onReady: function () {} },
    StudentApi: {},
    StudentContext: {}
  });
  runScript(runtime.context, "js/core/student-ui.js");

  assert.equal(
    runtime.window.StudentSignInUI.messageForErrorCode("STUDENT_NOT_FOUND"),
    "We couldn't find that student ID. Check it and try again."
  );
  assert.equal(
    runtime.window.StudentSignInUI.messageForErrorCode("STUDENT_INACTIVE"),
    "Your student account is not currently active. Please speak to your tutor."
  );
  assert.equal(
    runtime.window.StudentSignInUI.messageForErrorCode("NETWORK_ERROR"),
    "We couldn't connect to the student service. Please try again."
  );
});
