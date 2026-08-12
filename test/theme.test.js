const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function core() {
  const sandbox = { console, URL, Date, setTimeout, clearTimeout };
  vm.createContext(sandbox);
  vm.runInContext(read("vendor/learning-platform-core/0.1.0/learning-platform-core.iife.js"), sandbox);
  return sandbox.LearningPlatformCore;
}

function storage(value) {
  const values = new Map();
  if (value !== undefined) values.set("learning-platform.theme.v1", value);
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, next) { values.set(key, String(next)); },
    removeItem(key) { values.delete(key); }
  };
}

function themeRuntime(stored, dark) {
  let mediaListener;
  const runtimeStorage = storage(stored);
  const rootElement = { dataset: {}, style: { colorScheme: "", setProperty() {} } };
  const document = { documentElement: rootElement, dispatchEvent() {} };
  const media = {
    matches: Boolean(dark),
    addEventListener(event, listener) { if (event === "change") mediaListener = listener; },
    removeEventListener() {}
  };
  const window = {
    matchMedia() { return media; },
    CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options.detail; }
  };
  const service = core().createThemeService({ document, window, storage: runtimeStorage });
  return { service, rootElement, storage: runtimeStorage, media, change() { mediaListener(); } };
}

test("the early bootstrap uses the Core theme storage key before deferred scripts", function () {
  const attributes = {};
  const window = {
    localStorage: storage("dark"),
    matchMedia() { return { matches: false }; }
  };
  const document = {
    documentElement: { setAttribute(name, value) { attributes[name] = value; } }
  };
  vm.runInNewContext(read("js/core/theme-bootstrap.js"), { window, document });
  assert.equal(attributes["data-theme"], "dark");
  assert.equal(attributes["data-theme-preference"], "dark");
  assert.match(read("js/core/theme-bootstrap.js"), /learning-platform\.theme\.v1/);
});

test("the early bootstrap migrates an existing hub theme preference", function () {
  const values = new Map([["tlevel.softwareDevelopment.theme.v1", "dark"]]);
  const attributes = {};
  const window = {
    localStorage: {
      getItem(key) { return values.get(key) || null; },
      setItem(key, value) { values.set(key, value); }
    },
    matchMedia() { return { matches: false }; }
  };
  const document = { documentElement: { setAttribute(name, value) { attributes[name] = value; } } };
  vm.runInNewContext(read("js/core/theme-bootstrap.js"), { window, document });
  assert.equal(attributes["data-theme"], "dark");
  assert.equal(values.get("learning-platform.theme.v1"), "dark");
});

test("Core theme defaults to system and resolves the operating-system preference", function () {
  const runtime = themeRuntime(undefined, true);
  assert.equal(runtime.service.getPreference(), "system");
  assert.equal(runtime.service.getResolvedTheme(), "dark");
  assert.equal(runtime.rootElement.dataset.theme, "dark");
});

test("Core theme restores stored light and dark preferences", function () {
  const light = themeRuntime("light", true);
  const dark = themeRuntime("dark", false);
  assert.equal(light.service.getResolvedTheme(), "light");
  assert.equal(dark.service.getResolvedTheme(), "dark");
});

test("Core theme rejects invalid stored preferences", function () {
  const runtime = themeRuntime("sepia", false);
  assert.equal(runtime.service.getPreference(), "system");
  assert.equal(runtime.service.getResolvedTheme(), "light");
});

test("Core theme persists explicit changes and follows system changes", function () {
  const runtime = themeRuntime(undefined, false);
  runtime.service.setPreference("dark");
  assert.equal(runtime.storage.getItem("learning-platform.theme.v1"), "dark");
  assert.equal(runtime.rootElement.dataset.theme, "dark");

  runtime.service.setPreference("system");
  runtime.media.matches = true;
  runtime.change();
  assert.equal(runtime.service.getPreference(), "system");
  assert.equal(runtime.rootElement.dataset.theme, "dark");
});

test("the hub ThemeService is a thin adapter over platform.theme", function () {
  const controls = [];
  const document = { querySelectorAll() { return controls; } };
  const subscribers = [];
  const theme = {
    storageKey: "learning-platform.theme.v1",
    modes: ["light", "dark", "system"],
    getPreference() { return "system"; },
    getResolvedTheme() { return "light"; },
    apply() { return { resolvedTheme: "light" }; },
    setPreference() {},
    subscribe(listener) { subscribers.push(listener); return function () {}; }
  };
  const window = { LearningPlatform: { platform: { theme } } };
  vm.runInNewContext(read("js/core/theme.js"), { window, document });
  assert.equal(window.ThemeService.storageKey, "learning-platform.theme.v1");
  assert.equal(window.ThemeService.getThemePreference(), "system");
  assert.equal(subscribers.length, 1);
  assert.doesNotMatch(read("js/core/theme.js"), /localStorage|matchMedia/);
});

test("every route loads the no-flash bootstrap, Core CSS, and theme adapter", function () {
  const routes = [
    "index.html",
    "course-guide/index.html",
    "foundations/index.html",
    "foundations/programming-diagnostic/index.html",
    "foundations/requirements-classification/index.html",
    "foundations/problem-decomposition/index.html",
    "foundations/data-design/index.html",
    "foundations/testing-methods/index.html",
    "projects/index.html",
    "task-1/index.html",
    "task-2/index.html",
    "task-3/index.html",
    "assessment-practice/index.html",
    "resources/index.html",
    "help/index.html"
  ];
  routes.forEach(function (route) {
    const html = read(route);
    assert.match(html, /theme-bootstrap\.js\?v=2/);
    assert.match(html, /vendor\/learning-platform-core\/0\.1\.0\/theme\.css/);
    assert.ok(html.indexOf("theme-bootstrap.js") < html.indexOf("learning-platform-core.iife.js"));
    assert.ok(html.indexOf("learning-platform-core.iife.js") < html.indexOf("js/core/theme.js?v=2"));
  });
});
