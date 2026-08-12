(function () {
  "use strict";

  var platform = window.LearningPlatform && window.LearningPlatform.platform;
  var theme = platform && platform.theme;

  if (!theme) {
    throw new Error("LEARNING_PLATFORM_THEME_UNAVAILABLE");
  }

  function syncControls() {
    document.querySelectorAll("[data-theme-select]").forEach(function (control) {
      control.value = theme.getPreference();
      control.setAttribute("aria-label", "Theme preference: " + theme.getPreference());
    });
  }

  function attachControls(root) {
    var scope = root || document;
    scope.querySelectorAll("[data-theme-select]").forEach(function (control) {
      control.value = theme.getPreference();
      control.setAttribute("aria-label", "Theme preference: " + theme.getPreference());
      control.addEventListener("change", function () {
        theme.setPreference(control.value);
      });
    });
  }

  theme.subscribe(syncControls);

  window.ThemeService = Object.freeze({
    storageKey: theme.storageKey,
    themes: theme.modes,
    getThemePreference: theme.getPreference,
    getResolvedTheme: theme.getResolvedTheme,
    applyTheme: function () { return theme.apply().resolvedTheme; },
    setThemePreference: function (preference) {
      try {
        theme.setPreference(preference);
        return true;
      } catch (error) {
        return false;
      }
    },
    attachControls: attachControls
  });
})();
