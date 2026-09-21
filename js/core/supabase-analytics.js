(function () {
  "use strict";

  var platform = window.LearningPlatform && window.LearningPlatform.platform;

  function hubAssignments() {
    var assignments = (platform && (platform.assignments || platform.assignment)) || {};
    var hubCode = platform && platform.config && platform.config.hubCode;
    var cached;
    if (typeof assignments.getCachedHubAssignments === "function" && hubCode) {
      cached = assignments.getCachedHubAssignments(hubCode);
      if (Array.isArray(cached)) return Promise.resolve(cached);
    }
    if (typeof assignments.getHubAssignments === "function" && hubCode) {
      return assignments.getHubAssignments(hubCode);
    }
    if (typeof assignments.getAssignments === "function") {
      return assignments.getAssignments();
    }
    return Promise.resolve([]);
  }

  function studentProgress() {
    if (!platform || !platform.progress || typeof platform.progress.getProgress !== "function") {
      return Promise.resolve({ activities: [], attempts: [], assignments: [] });
    }
    return Promise.all([
      platform.progress.getProgress(),
      hubAssignments()
    ]).then(function (values) {
      return {
        activities: Array.isArray(values[0]) ? values[0] : [],
        attempts: [],
        assignments: Array.isArray(values[1]) ? values[1] : []
      };
    });
  }

  window.SupabaseAnalytics = Object.freeze({
    studentProgress: studentProgress
  });
})();
