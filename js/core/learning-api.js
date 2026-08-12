(function () {
  "use strict";

  var submission = window.SupabaseLearningApi;
  var analytics = window.SupabaseAnalytics;

  window.LearningApi = Object.freeze({
    canSubmit: function (result) { return submission.canSubmit(result); },
    modeFor: function () { return "supabase"; },
    submitResult: function (result) { return submission.submitResult(result); },
    getProgress: function () { return analytics.studentProgress(); }
  });
})();
