(function () {
  "use strict";

  var storageKey = "learning-platform.theme.v1";
  var legacyStorageKey = "tlevel.softwareDevelopment.theme.v1";
  var validThemes = ["system", "light", "dark"];
  var preference = "system";

  try {
    var storedPreference = window.localStorage.getItem(storageKey) ||
      window.localStorage.getItem(legacyStorageKey);
    if (validThemes.indexOf(storedPreference) !== -1) {
      preference = storedPreference;
      window.localStorage.setItem(storageKey, preference);
    }
  } catch (error) {
    preference = "system";
  }

  var resolvedTheme = preference;
  if (resolvedTheme === "system") {
    resolvedTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  document.documentElement.setAttribute("data-theme", resolvedTheme);
  document.documentElement.setAttribute("data-theme-preference", preference);
})();
