(function (root) {
  "use strict";

  var ns = root.LearningPlatformContent = root.LearningPlatformContent || {};

  ns.resolvedActivityVersion = function (activity) {
    var core = root.LearningPlatformCore;
    var raw;
    if (core && typeof core.resolveActivityVersion === "function") {
      return String(core.resolveActivityVersion(activity) || "");
    }
    raw = "";
    if (activity && typeof activity.version === "string") raw = activity.version.trim();
    else if (activity && typeof activity.activityVersion === "string") raw = activity.activityVersion.trim();
    if (/^\d+\.\d+$/.test(raw)) return raw + ".0";
    if (!/^\d+\.\d+\.\d+/.test(raw)) return "";
    return raw;
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
