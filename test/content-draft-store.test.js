const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function loadEngine(browserWindow) {
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
  return browserWindow.LearningPlatformContent;
}

function memoryStorage() {
  const data = {};
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
    removeItem(key) { delete data[key]; }
  };
}

test("week draft save attaches to Core after a later sign-in", function () {
  const saved = [];
  let signedIn = false;
  const browserWindow = {
    localStorage: memoryStorage(),
    LearningPlatform: {
      platform: {
        auth: {
          isSignedIn() { return signedIn; },
          getSession() { return signedIn ? { user: { id: "auth-user" } } : null; }
        },
        progress: {
          createStore() {
            return {
              save(draft) { saved.push(draft); },
              hydrate(local) { return Promise.resolve(local); },
              flush() { return Promise.resolve(null); }
            };
          }
        }
      }
    }
  };
  const engine = loadEngine(browserWindow);
  const activity = { id: "week-1-lesson-1-ex-07", version: "0.1.0" };
  const store = engine.createDraftStore(activity, { storage: browserWindow.localStorage });
  const draft = store.load();
  draft.responses = { "week-1-lesson-1-ex-07:users": { "item-1": "user" } };
  store.save(draft);
  assert.equal(saved.length, 0);

  signedIn = true;
  store.save(draft);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].responses["week-1-lesson-1-ex-07:users"]["item-1"], "user");
});
