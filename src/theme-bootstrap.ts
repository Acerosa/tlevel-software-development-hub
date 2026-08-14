try {
  const storageKey = "learning-platform.theme.v1";
  const legacyStorageKey = "tlevel.softwareDevelopment.theme.v1";
  const stored = window.localStorage.getItem(storageKey) || window.localStorage.getItem(legacyStorageKey);
  const preference = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  if (stored === "light" || stored === "dark" || stored === "system") {
    window.localStorage.setItem(storageKey, preference);
  }
  const resolved = preference === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : preference;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-theme-preference", preference);
} catch {
  document.documentElement.setAttribute("data-theme", "light");
  document.documentElement.setAttribute("data-theme-preference", "system");
}
