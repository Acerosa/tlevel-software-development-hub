const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function memoryStorage() {
  const data = {};
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
    removeItem(key) { delete data[key]; }
  };
}

function loadEngine(saved) {
  const browserWindow = {
    localStorage: memoryStorage(),
    LearningPlatform: {
      platform: {
        auth: {
          isSignedIn() { return true; },
          getSession() { return { user: { id: "auth-user" } }; }
        },
        progress: {
          createStore() {
            return {
              save(draft, options) { saved.push({ draft, options: options || {} }); },
              hydrate(local) { return Promise.resolve(local); },
              flush() { return Promise.resolve(null); },
              clear() { return Promise.resolve(); }
            };
          }
        }
      }
    }
  };
  const context = vm.createContext({
    window: browserWindow,
    globalThis: browserWindow,
    console,
    Date,
    Math,
    Object,
    Array,
    String,
    Number,
    JSON,
    encodeURIComponent,
    Promise
  });
  vm.runInContext(read("content/engine/version.js"), context, { filename: "content/engine/version.js" });
  vm.runInContext(read("content/engine/state.js"), context, { filename: "content/engine/state.js" });
  return { engine: browserWindow.LearningPlatformContent, storage: browserWindow.localStorage };
}

test("Check upserts the latest checked response and does not append a second question key", function () {
  const saved = [];
  const { engine, storage } = loadEngine(saved);
  const activity = { id: "week-1-lesson-1-ex-01", version: "0.1.0" };
  const store = engine.createDraftStore(activity, { storage });
  const first = store.load();
  first.responses = { q1: "A" };
  first.checked = { q1: true };
  store.save(first, { immediate: true });
  const retry = store.load();
  retry.responses = { q1: "C" };
  retry.checked = { q1: true };
  store.save(retry, { immediate: true });
  assert.equal(saved.length, 2);
  assert.equal(saved[0].options.immediate, true);
  assert.equal(saved[1].draft.responses.q1, "C");
  assert.deepEqual(Object.keys(saved[1].draft.responses), ["q1"]);
  assert.equal(saved[1].draft.checked.q1, true);
});

test("unchecked selection stays local cache and does not call a remote save", function () {
  const saved = [];
  const { engine, storage } = loadEngine(saved);
  const activity = { id: "week-1-lesson-1-ex-01", version: "0.1.0" };
  const store = engine.createDraftStore(activity, { storage });
  const draft = store.load();
  draft.responses = { q1: "A" };
  draft.checked = { q1: false };
  store.save(draft, { remote: false });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].options.remote, false);
});

test("classification retry replaces the stored mapping for the same question", function () {
  const saved = [];
  const { engine, storage } = loadEngine(saved);
  const activity = { id: "week-1-lesson-1-ex-07", version: "0.1.0" };
  const store = engine.createDraftStore(activity, { storage });
  const qid = "week-1-lesson-1-ex-07:users";
  const draft = store.load();
  draft.responses = { [qid]: { "item-1": "user", "item-2": "not-user" } };
  draft.checked = { [qid]: true };
  store.save(draft, { immediate: true });
  draft.responses[qid] = { "item-1": "not-user", "item-2": "user" };
  store.save(draft, { immediate: true });
  assert.equal(saved.at(-1).draft.responses[qid]["item-1"], "not-user");
  assert.deepEqual(Object.keys(saved.at(-1).draft.responses), [qid]);
});

test("week draft store forwards Core isDirty so remote restore cannot overwrite unsaved work", function () {
  assert.match(read("content/engine/state.js"), /isDirty: function \(\)/);
  assert.match(read("content/engine/interactive.js"), /store\.isDirty && store\.isDirty\(\)/);
});

test("lp-block-result Try again clears checked and persists the reset immediately", function () {
  const source = read("content/engine/interactive.js");
  assert.match(source, /detail\.completed === false/);
  assert.match(source, /draft\.responses\[qid\] = detail\.response/);
  assert.match(source, /draft\.checked\[qid\] = false/);
  assert.match(source, /persistChecked\(\{ immediate: true \}\)/);
  assert.doesNotMatch(
    source,
    /detail\.completed === false[\s\S]{0,250}persistChecked\(\{ remote: false \}\)/
  );
});

test("practice completed flag is stripped before a Core save from the week engine helper path", function () {
  const saved = [];
  const { engine, storage } = loadEngine(saved);
  const activity = { id: "week-1-lesson-1-ex-01", version: "0.1.0" };
  const store = engine.createDraftStore(activity, { storage });
  const draft = Object.assign(store.load(), {
    responses: { q1: "C" },
    checked: { q1: true },
    completed: false
  });
  store.save(draft, { immediate: true });
  assert.equal(saved[0].draft.completed, false);
  assert.equal(saved[0].draft.checked.q1, true);
});
