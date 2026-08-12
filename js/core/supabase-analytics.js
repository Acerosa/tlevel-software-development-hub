(function () {
  "use strict";

  var platform = window.LearningPlatform && window.LearningPlatform.platform;

  function studentProgress() {
    return Promise.all([
      platform.progress.getProgress(),
      platform.progress.getAttempts(),
      platform.assignment.getAssignments()
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
