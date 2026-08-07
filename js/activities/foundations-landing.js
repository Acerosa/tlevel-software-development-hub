(function () {
  "use strict";

  var utils = window.AppUtils;
  var state = window.FoundationActivityState;
  var catalog = window.FoundationActivityCatalog || [];

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
      var summary = state.getSummary(activity.id, activity.version);
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

  utils.onReady(function () {
    render();
    if (window.StudentContext && window.StudentContext.subscribe) {
      window.StudentContext.subscribe(render);
    }
  });
})();
