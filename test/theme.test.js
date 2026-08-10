const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const routeFiles = [
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

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function createStorage(initialValue) {
  var values = new Map();
  if (initialValue !== undefined) {
    values.set("tlevel.softwareDevelopment.theme.v1", initialValue);
  }
  return {
    getItem: function (key) { return values.has(key) ? values.get(key) : null; },
    setItem: function (key, value) { values.set(key, String(value)); },
    valueFor: function (key) { return values.get(key); }
  };
}

function createMediaQuery(isDark) {
  var listeners = [];
  return {
    matches: isDark,
    addEventListener: function (eventName, listener) {
      if (eventName === "change") listeners.push(listener);
    },
    change: function (nextIsDark) {
      this.matches = nextIsDark;
      listeners.forEach(function (listener) { listener({ matches: nextIsDark }); });
    }
  };
}

function createDocument() {
  var attributes = {};
  var controls = [];
  var themeColor = {
    attributes: {},
    setAttribute: function (name, value) { this.attributes[name] = value; }
  };
  var documentElement = {
    style: {},
    setAttribute: function (name, value) { attributes[name] = value; },
    getAttribute: function (name) { return attributes[name] || null; }
  };
  return {
    documentElement,
    themeColor,
    controls,
    querySelector: function (selector) {
      return selector === 'meta[name="theme-color"]' ? themeColor : null;
    },
    querySelectorAll: function (selector) {
      return selector === "[data-theme-select]" ? controls : [];
    },
    dispatchEvent: function () {}
  };
}

function loadTheme(storedPreference, systemDark) {
  var document = createDocument();
  var localStorage = createStorage(storedPreference);
  var mediaQuery = createMediaQuery(systemDark);
  var window = {
    localStorage,
    document,
    matchMedia: function () { return mediaQuery; },
    CustomEvent: function (name, options) { this.name = name; this.detail = options.detail; }
  };
  var context = vm.createContext({ window, document, console });
  vm.runInContext(read("js/core/theme.js"), context, { filename: "js/core/theme.js" });
  return { document, localStorage, mediaQuery, service: window.ThemeService };
}

function loadBootstrap(storedPreference, systemDark) {
  var document = createDocument();
  var localStorage = createStorage(storedPreference);
  var mediaQuery = createMediaQuery(systemDark);
  var window = {
    localStorage,
    matchMedia: function () { return mediaQuery; }
  };
  vm.runInContext(read("js/core/theme-bootstrap.js"), vm.createContext({ window, document }), {
    filename: "js/core/theme-bootstrap.js"
  });
  return document;
}

test("the early bootstrap applies the stored or system theme before page rendering", function () {
  var storedDark = loadBootstrap("dark", false);
  assert.equal(storedDark.documentElement.getAttribute("data-theme"), "dark");
  assert.equal(storedDark.documentElement.getAttribute("data-theme-preference"), "dark");

  var systemDark = loadBootstrap(undefined, true);
  assert.equal(systemDark.documentElement.getAttribute("data-theme"), "dark");
  assert.equal(systemDark.documentElement.getAttribute("data-theme-preference"), "system");
});

test("theme defaults to system and resolves the system preference", function () {
  var light = loadTheme(undefined, false);
  assert.equal(light.service.getThemePreference(), "system");
  assert.equal(light.service.getResolvedTheme(), "light");
  assert.equal(light.document.documentElement.getAttribute("data-theme"), "light");

  var dark = loadTheme(undefined, true);
  assert.equal(dark.service.getResolvedTheme(), "dark");
  assert.equal(dark.document.documentElement.getAttribute("data-theme"), "dark");
});

test("stored light and dark preferences are applied", function () {
  var light = loadTheme("light", true);
  assert.equal(light.service.getThemePreference(), "light");
  assert.equal(light.document.documentElement.getAttribute("data-theme"), "light");

  var dark = loadTheme("dark", false);
  assert.equal(dark.service.getThemePreference(), "dark");
  assert.equal(dark.document.documentElement.getAttribute("data-theme"), "dark");
});

test("stored system preference remains system while resolving to the current environment", function () {
  var runtime = loadTheme("system", true);
  assert.equal(runtime.service.getThemePreference(), "system");
  assert.equal(runtime.service.getResolvedTheme(), "dark");
  assert.equal(runtime.document.documentElement.getAttribute("data-theme-preference"), "system");
  assert.equal(runtime.document.documentElement.getAttribute("data-theme"), "dark");
});

test("invalid stored preference falls back to system", function () {
  var runtime = loadTheme("neon", false);
  assert.equal(runtime.service.getThemePreference(), "system");
  assert.equal(runtime.document.documentElement.getAttribute("data-theme-preference"), "system");
});

test("setting a preference applies and persists without a reload", function () {
  var runtime = loadTheme("system", false);
  assert.equal(runtime.service.setThemePreference("dark"), true);
  assert.equal(runtime.service.getThemePreference(), "dark");
  assert.equal(runtime.document.documentElement.getAttribute("data-theme"), "dark");
  assert.equal(runtime.localStorage.valueFor("tlevel.softwareDevelopment.theme.v1"), "dark");
  assert.equal(runtime.service.setThemePreference("invalid"), false);
  assert.equal(runtime.service.getThemePreference(), "dark");
});

test("system changes update the rendered theme without replacing the system preference", function () {
  var runtime = loadTheme("system", false);
  runtime.mediaQuery.change(true);
  assert.equal(runtime.document.documentElement.getAttribute("data-theme"), "dark");
  assert.equal(runtime.service.getThemePreference(), "system");
  assert.equal(runtime.localStorage.valueFor("tlevel.softwareDevelopment.theme.v1"), "system");
});

test("theme controls are labelled, synchronised and keyboard/select accessible", function () {
  var runtime = loadTheme("light", false);
  var changes = [];
  var control = {
    value: "",
    attributes: {},
    setAttribute: function (name, value) { this.attributes[name] = value; },
    addEventListener: function (name, listener) { changes.push(listener); }
  };
  runtime.document.controls.push(control);
  runtime.service.attachControls(runtime.document);
  assert.equal(control.value, "light");
  assert.equal(control.attributes["aria-label"], "Theme preference: light");
  control.value = "dark";
  changes[0]();
  assert.equal(runtime.service.getThemePreference(), "dark");
  assert.equal(runtime.document.documentElement.getAttribute("data-theme"), "dark");
});

test("every route includes the early bootstrap and shared theme service", function () {
  routeFiles.forEach(function (route) {
    var html = read(route);
    assert.match(html, /theme-bootstrap\.js/, route);
    assert.match(html, /theme\.js/, route);
    assert.match(html, /data-site-header/, route);
    assert.ok(html.indexOf("theme.js") < html.indexOf("navigation.js"), route + " must load the theme service before navigation");
  });
  assert.match(read("js/core/navigation.js"), /data-theme-select/);
  assert.match(read("js/core/theme.js"), /tlevel\.softwareDevelopment\.theme\.v1/);
});
