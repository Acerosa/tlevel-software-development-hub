(function () {
  "use strict";

  var platform = window.LearningPlatform && window.LearningPlatform.platform;

  function hubAssignments() {
    var assignments = (platform && (platform.assignments || platform.assignment)) || {};
    var hubCode = platform && platform.config && platform.config.hubCode;
    if (typeof assignments.getHubAssignments === "function" && hubCode) {
      return assignments.getHubAssignments(hubCode);
    }
    if (typeof assignments.getAssignments === "function") {
      return assignments.getAssignments();
    }
    return Promise.resolve([]);
  }

  function studentProgress() {
    return Promise.all([
      platform.progress.getProgress(),
      platform.progress.getAttempts(),
      hubAssignments()
    ]).then(function (values) {
      return {
        activities: Array.isArray(values[0]) ? values[0] : [],
        attempts: Array.isArray(values[1]) ? values[1] : [],
        assignments: Array.isArray(values[2]) ? values[2] : []
      };
    });
  }

  window.SupabaseAnalytics = Object.freeze({
    studentProgress: studentProgress
  });
})();
