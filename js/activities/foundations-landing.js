(function () {
  "use strict";

  var utils = window.AppUtils;
  var state = window.FoundationActivityState;
  var catalog = window.FoundationActivityCatalog || [];
  var analytics = window.SupabaseAnalytics;
  var remoteProgress = null;
  var refreshToken = 0;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render() {
    var mount = document.querySelector("[data-foundations-catalog]");
    if (!mount) {
      return;
    }

    mount.innerHTML = catalog.map(function (activity) {
      var summary = remoteSummary(activity) || state.getSummary(activity.id, activity.version);
      var topics = activity.topics.map(function (topic) {
        return "<li>" + escapeHtml(topic) + "</li>";
      }).join("");

      return (
        '<article class="activity-card">' +
        '<div class="activity-card__heading"><div>' +
        '<p class="activity-card__type">' + escapeHtml(activity.type) + "</p>" +
        '<h2><a href="' + escapeHtml(activity.path) + '">' + escapeHtml(activity.title) + "</a></h2>" +
        '</div><span class="activity-status activity-status--' + summary.status + '">' +
        escapeHtml(summary.label) + "</span></div>" +
        "<p>" + escapeHtml(activity.purpose) + "</p>" +
        '<p class="activity-card__meta">' + escapeHtml(activity.detail) + "</p>" +
        '<h3 class="activity-card__topics-title">Topics covered</h3>' +
        '<ul class="activity-card__topics">' + topics + "</ul>" +
        '<a class="primary-button activity-card__action" href="' + escapeHtml(activity.path) + '">' +
        escapeHtml(summary.action) + "</a>" +
        "</article>"
      );
    }).join("");
  }

  function remoteSummary(activity) {
    if (!remoteProgress) {
      return null;
    }
    var progress = remoteProgress.activities.filter(function (item) {
      return item.activity_key === activity.id && item.activity_version === activity.version;
    })[0];
    if (progress) {
      return {
        status: "completed",
        label: "Completed, " + progress.latest_score + "/" + progress.max_score,
        action: "Revisit activity",
        percentage: progress.max_score > 0
          ? Math.round((Number(progress.latest_score) / Number(progress.max_score)) * 100)
          : 0
      };
    }
    var assigned = remoteProgress.assignments.some(function (item) {
      return item.activity_key === activity.id && item.activity_version === activity.version;
    });
    return assigned ? { status: "not-started", label: "Assigned", action: "Start activity" } : null;
  }

  function refreshRemoteProgress() {
    if (!analytics || !window.StudentContext || !window.StudentContext.isSignedIn()) {
      remoteProgress = null;
      render();
      return;
    }
    var token = ++refreshToken;
    analytics.studentProgress().then(function (progress) {
      if (token !== refreshToken) return;
      remoteProgress = progress;
      render();
    }).catch(function () {
      if (token === refreshToken) {
        remoteProgress = null;
        render();
      }
    });
  }

  utils.onReady(function () {
    render();
    if (window.StudentContext && window.StudentContext.subscribe) {
      window.StudentContext.subscribe(function () {
        render();
        refreshRemoteProgress();
      });
    }
  });
})();
