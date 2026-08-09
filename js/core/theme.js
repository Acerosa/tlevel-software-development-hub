(function () {
  "use strict";

  var storageKey = "tlevel.softwareDevelopment.theme.v1";
  var validThemes = Object.freeze(["system", "light", "dark"]);
  var mediaQuery = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
  var preference = readPreference();

  function storage() {
    try {
      return window.localStorage;
    } catch (error) {
      return null;
    }
  }

  function readPreference() {
    var currentStorage = storage();
    var storedPreference = null;
    if (currentStorage) {
      try {
        storedPreference = currentStorage.getItem(storageKey);
      } catch (error) {
        storedPreference = null;
      }
    }
    return validThemes.indexOf(storedPreference) !== -1 ? storedPreference : "system";
  }

  function getResolvedTheme(themePreference) {
    if (themePreference === "dark" || themePreference === "light") {
      return themePreference;
    }
    return mediaQuery && mediaQuery.matches ? "dark" : "light";
  }

  function dispatchThemeChange() {
    if (!window.document || typeof window.document.dispatchEvent !== "function") {
      return;
    }
    var event = typeof window.CustomEvent === "function"
      ? new window.CustomEvent("themechange", {
        detail: { preference: preference, resolvedTheme: getResolvedTheme(preference) }
      })
      : null;
    if (event) {
      window.document.dispatchEvent(event);
    }
  }

  function syncControls() {
    if (!window.document || typeof window.document.querySelectorAll !== "function") {
      return;
    }
    window.document.querySelectorAll("[data-theme-select]").forEach(function (control) {
      control.value = preference;
      control.setAttribute("aria-label", "Theme preference: " + preference);
    });
  }

  function applyTheme(themePreference) {
    var nextPreference = validThemes.indexOf(themePreference) !== -1 ? themePreference : "system";
    var resolvedTheme = getResolvedTheme(nextPreference);
    if (window.document && window.document.documentElement) {
      window.document.documentElement.setAttribute("data-theme", resolvedTheme);
      window.document.documentElement.setAttribute("data-theme-preference", nextPreference);
      window.document.documentElement.style.colorScheme = resolvedTheme;
      if (typeof window.document.querySelector === "function") {
        var themeColor = window.document.querySelector('meta[name="theme-color"]');
        if (themeColor) {
          themeColor.setAttribute("content", resolvedTheme === "dark" ? "#0a1a28" : "#0d2a42");
        }
      }
    }
    syncControls();
    dispatchThemeChange();
    return resolvedTheme;
  }

  function setThemePreference(nextPreference) {
    if (validThemes.indexOf(nextPreference) === -1) {
      return false;
    }
    preference = nextPreference;
    var currentStorage = storage();
    if (currentStorage) {
      try {
        currentStorage.setItem(storageKey, preference);
      } catch (error) {
        // Continue with the in-memory preference when storage is unavailable.
      }
    }
    applyTheme(preference);
    return true;
  }

  function attachControls(root) {
    var scope = root || document;
    if (!scope || typeof scope.querySelectorAll !== "function") {
      return;
    }
    scope.querySelectorAll("[data-theme-select]").forEach(function (control) {
      control.value = preference;
      control.setAttribute("aria-label", "Theme preference: " + preference);
      control.addEventListener("change", function () {
        setThemePreference(control.value);
      });
    });
  }

  function handleSystemThemeChange() {
    if (preference === "system") {
      applyTheme(preference);
    }
  }

  if (mediaQuery) {
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleSystemThemeChange);
    }
  }

  applyTheme(preference);

  window.ThemeService = Object.freeze({
    storageKey: storageKey,
    themes: validThemes,
    getThemePreference: function () { return preference; },
    getResolvedTheme: function (themePreference) {
      return getResolvedTheme(themePreference === undefined ? preference : themePreference);
    },
    applyTheme: applyTheme,
    setThemePreference: setThemePreference,
    attachControls: attachControls
  });
})();
