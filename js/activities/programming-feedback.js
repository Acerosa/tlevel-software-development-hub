(function () {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render(marked, options) {
    var settings = options || {};
    var explanation = marked.feedback || marked.detail || "Review the exercise and try again.";
    var heading = marked.correct ? "Correct." : (settings.preview ? "Not quite yet." : "Review this.");
    return '<div class="question-feedback question-feedback--' +
      (marked.correct ? "correct" : "incorrect") + '" role="status" tabindex="-1" ' +
      (settings.preview ? 'data-programming-preview-feedback' : "") + '><p><strong>' +
      heading + "</strong> " + escapeHtml(explanation) + "</p></div>";
  }

  function renderInto(container, marked) {
    if (!container) {
      return;
    }
    container.innerHTML = render(marked, { preview: true });
    var feedback = container.querySelector("[data-programming-preview-feedback]");
    if (feedback) {
      feedback.focus();
    }
  }

  window.FoundationProgrammingFeedback = Object.freeze({
    render: render,
    renderInto: renderInto
  });
})();
