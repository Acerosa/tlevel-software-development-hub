(function () {
  "use strict";

  var utils = window.AppUtils;
  var marking = window.FoundationActivityMarking;
  var stateService = window.FoundationActivityState;
  var activity = window.FoundationActivityData;
  var mount;
  var store;
  var attempt;
  var currentIndex = 0;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function sectionById(sectionId) {
    return activity.sections.filter(function (section) {
      return section.id === sectionId;
    })[0];
  }

  function questionById(questionId) {
    var match;
    activity.sections.some(function (section) {
      match = section.questions.filter(function (question) {
        return question.id === questionId;
      })[0];
      return Boolean(match);
    });
    return match;
  }

  function optionList(question, submitted) {
    var inputType = question.type === "multiple" ? "checkbox" : "radio";
    var current = attempt.responses[question.id];

    return '<div class="answer-options">' + question.options.map(function (option) {
      var checked = question.type === "multiple"
        ? Array.isArray(current) && current.indexOf(option.value) !== -1
        : current === option.value;
      return (
        '<label class="answer-option"><input type="' + inputType + '" name="' +
        escapeHtml(question.id) + '" value="' + escapeHtml(option.value) + '"' +
        (checked ? " checked" : "") + (submitted ? " disabled" : "") + ">" +
        '<span>' + escapeHtml(option.label) + "</span></label>"
      );
    }).join("") + "</div>";
  }

  function textAnswer(question, submitted) {
    var current = attempt.responses[question.id] || "";
    return (
      '<div class="short-answer"><label for="answer-' + escapeHtml(question.id) + '">' +
      escapeHtml(question.answerLabel || "Your answer") + "</label>" +
      '<input id="answer-' + escapeHtml(question.id) + '" name="' + escapeHtml(question.id) +
      '" type="text" autocomplete="off" value="' + escapeHtml(current) + '"' +
      (submitted ? " disabled" : "") + "></div>"
    );
  }

  function matchingAnswer(question, submitted) {
    var current = attempt.responses[question.id] || {};
    var rows = question.rows.map(function (row) {
      var options = '<option value="">Choose an answer</option>' + question.options.map(function (option) {
        return '<option value="' + escapeHtml(option.value) + '"' +
          (current[row.id] === option.value ? " selected" : "") + ">" +
          escapeHtml(option.label) + "</option>";
      }).join("");
      return (
        "<tr><th scope=\"row\">" + escapeHtml(row.label) + "</th><td>" +
        '<label class="visually-hidden" for="match-' + escapeHtml(question.id) + "-" +
        escapeHtml(row.id) + '">Match for ' + escapeHtml(row.label) + "</label>" +
        '<select id="match-' + escapeHtml(question.id) + "-" + escapeHtml(row.id) +
        '" data-match-row="' + escapeHtml(row.id) + '" name="' + escapeHtml(question.id) +
        '"' + (submitted ? " disabled" : "") + ">" + options + "</select></td></tr>"
      );
    }).join("");

    return '<div class="matching-table-wrapper"><table class="matching-table"><thead><tr><th scope="col">Item</th><th scope="col">Match</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  }

  function orderAnswer(question, submitted) {
    var current = attempt.responses[question.id] || [];
    return '<ol class="order-list">' + question.items.map(function (item) {
      var selectedPosition = current.indexOf(item.id) + 1;
      var options = '<option value="">Choose position</option>' + question.items.map(function (_, index) {
        var position = index + 1;
        return '<option value="' + position + '"' +
          (selectedPosition === position ? " selected" : "") + ">Position " + position + "</option>";
      }).join("");

      return (
        '<li><span>' + escapeHtml(item.label) + '</span><label class="visually-hidden" for="order-' +
        escapeHtml(question.id) + "-" + escapeHtml(item.id) + '">Position for ' +
        escapeHtml(item.label) + '</label><select id="order-' + escapeHtml(question.id) + "-" +
        escapeHtml(item.id) + '" name="' + escapeHtml(question.id) + '" data-order-item="' +
        escapeHtml(item.id) + '"' + (submitted ? " disabled" : "") + ">" + options +
        "</select></li>"
      );
    }).join("") + "</ol>";
  }

  function renderTable(table) {
    if (!table) {
      return "";
    }

    var heading = table.caption
      ? '<caption class="visually-hidden">' + escapeHtml(table.caption) + "</caption>"
      : "";
    var headers = table.headers.map(function (header) {
      return '<th scope="col">' + escapeHtml(header) + "</th>";
    }).join("");
    var rows = table.rows.map(function (row) {
      return "<tr>" + row.map(function (cell) {
        return "<td>" + escapeHtml(cell) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    return '<div class="data-table-wrapper"><table class="data-table">' + heading +
      "<thead><tr>" + headers + "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  }

  function renderErd(erd) {
    if (!erd) {
      return "";
    }

    var entities = erd.entities.map(function (entity) {
      return '<section class="erd__entity"><h3>' + escapeHtml(entity.name) + '</h3><ul>' +
        entity.fields.map(function (field) {
          return "<li>" + escapeHtml(field) + "</li>";
        }).join("") + "</ul></section>";
    }).join("");

    return '<div class="erd" role="group" aria-label="' + escapeHtml(erd.label) + '">' +
      entities + '</div><p class="question-context"><strong>Relationships:</strong> ' +
      escapeHtml(erd.relationships) + "</p>";
  }

  function feedbackFor(question, response) {
    var marked = marking.markQuestion(question, response);
    return (
      '<div class="question-feedback question-feedback--' + (marked.correct ? "correct" : "incorrect") +
      '" role="status"><p><strong>' + (marked.correct ? "Correct." : "Review this.") +
      "</strong> " + escapeHtml(marked.feedback || "Review the explanation and try again.") +
      "</p></div>"
    );
  }

  function renderQuestion(question, number, submitted) {
    var response = attempt.responses[question.id];
    var marked = submitted ? marking.markQuestion(question, response) : null;
    var classes = "question-panel";
    if (marked) {
      classes += marked.correct ? " question-panel--correct" : " question-panel--incorrect";
    }

    var answerHtml = question.type === "text"
      ? textAnswer(question, submitted)
      : question.type === "matching"
        ? matchingAnswer(question, submitted)
        : question.type === "order"
          ? orderAnswer(question, submitted)
          : optionList(question, submitted);

    return (
      '<fieldset class="' + classes + '" data-question-id="' + escapeHtml(question.id) + '">' +
      '<legend>' + number + ". " + escapeHtml(question.prompt) + "</legend>" +
      (question.context ? '<p class="question-context">' + escapeHtml(question.context) + "</p>" : "") +
      (question.code ? '<pre class="code-sample"><code>' + escapeHtml(question.code) + "</code></pre>" : "") +
      renderTable(question.table) + renderErd(question.erd) + answerHtml +
      (submitted ? feedbackFor(question, response) : "") +
      "</fieldset>"
    );
  }

  function progressHtml() {
    var complete = attempt.submittedSections.length;
    var total = activity.sections.length;
    var width = Math.round((complete / total) * 100);
    var buttons = activity.sections.map(function (section, index) {
      var submitted = attempt.submittedSections.indexOf(section.id) !== -1;
      return (
        '<li><button class="section-navigator__button" type="button" data-action="go-section" ' +
        'data-section-id="' + escapeHtml(section.id) + '" data-complete="' + String(submitted) + '"' +
        (index === currentIndex ? ' aria-current="step"' : "") + ">" +
        escapeHtml(section.title) + "</button></li>"
      );
    }).join("");

    return (
      '<section class="activity-overview" aria-labelledby="activity-progress-heading">' +
      '<div class="activity-progress"><h2 id="activity-progress-heading">Activity progress</h2>' +
      "<p>" + complete + " of " + total + " sections submitted</p>" +
      '<div class="activity-progress__track" role="progressbar" aria-valuemin="0" aria-valuemax="' +
      total + '" aria-valuenow="' + complete + '" aria-label="Sections submitted">' +
      '<span class="activity-progress__bar" style="width: ' + width + '%"></span></div></div>' +
      '<nav class="section-navigator" aria-label="Activity sections"><h2>Sections</h2>' +
      '<ol class="section-navigator__list">' + buttons + "</ol></nav></section>"
    );
  }

  function sectionSummary(section) {
    var result = marking.markSection(section, attempt.responses);
    return (
      '<div class="activity-section-summary" role="status" tabindex="-1" data-section-summary>' +
      '<p><strong>' + result.score + " of " + result.maxScore + " correct.</strong> " +
      escapeHtml(result.status) + ". Review the explanations or retry this section.</p></div>"
    );
  }

  function sectionActions(section, submitted) {
    var actions = [];
    if (submitted) {
      actions.push('<button class="secondary-button" type="button" data-action="retry-section">Retry this section</button>');
    } else {
      actions.push('<button class="primary-button" type="submit">Submit ' + escapeHtml(section.title) + "</button>");
    }

    if (currentIndex > 0) {
      actions.push('<button class="secondary-button" type="button" data-action="previous-section">Previous section</button>');
    }
    if (currentIndex < activity.sections.length - 1) {
      actions.push('<button class="secondary-button" type="button" data-action="next-section">Next section</button>');
    }
    if (attempt.result) {
      actions.push('<button class="secondary-button" type="button" data-action="show-results">View results</button>');
    }

    return '<div class="activity-actions">' + actions.join("") + "</div>";
  }

  function renderSection() {
    var section = activity.sections[currentIndex];
    var submitted = attempt.submittedSections.indexOf(section.id) !== -1;
    var questions = section.questions.map(function (question, index) {
      return renderQuestion(question, index + 1, submitted);
    }).join("");

    mount.innerHTML = '<div class="activity-shell">' + progressHtml() +
      '<section class="activity-section" aria-labelledby="section-heading">' +
      '<header class="activity-section__header"><p class="activity-section__eyebrow">Section ' +
      (currentIndex + 1) + " of " + activity.sections.length + '</p><h2 id="section-heading" tabindex="-1">' +
      escapeHtml(section.title) + "</h2><p>" + escapeHtml(section.intro) + "</p></header>" +
      (submitted ? sectionSummary(section) : '<div class="activity-error-summary" data-activity-error tabindex="-1" hidden></div>') +
      '<form data-activity-form novalidate><div class="question-list">' + questions + "</div>" +
      sectionActions(section, submitted) + "</form></section></div>";
    bindEvents();
  }

  function renderResults() {
    var result = attempt.result;
    var confidence = result.sections.filter(function (section) {
      return section.percentage >= 80;
    }).map(function (section) { return section.title; });
    var revisit = result.sections.filter(function (section) {
      return section.percentage < 80;
    }).map(function (section) { return section.title; });
    var rows = result.sections.map(function (section) {
      return (
        '<li class="performance-row"><span><strong>' + escapeHtml(section.title) + "</strong><br>" +
        section.score + " of " + section.maxScore + " correct</span>" +
        '<span class="performance-row__status">' + escapeHtml(section.status) + "</span>" +
        '<button class="performance-row__review" type="button" data-action="review-section" data-section-id="' +
        escapeHtml(section.sectionId) + '">Review section</button></li>'
      );
    }).join("");

    mount.innerHTML = '<section class="activity-results" aria-labelledby="results-heading">' +
      '<h2 id="results-heading" tabindex="-1">Activity result</h2>' +
      '<p>' + escapeHtml(activity.resultIntro || "Use this summary to decide what to review next.") + "</p>" +
      '<div class="result-score"><span class="result-score__value">' + result.percentage + '%</span><span>' +
      result.score + " of " + result.maxScore + " correct</span></div>" +
      '<p><strong>Areas of relative confidence:</strong> ' +
      escapeHtml(confidence.length ? confidence.join(", ") : "Keep practising across all sections") + ".</p>" +
      '<p><strong>Areas to revisit:</strong> ' +
      escapeHtml(revisit.length ? revisit.join(", ") : "No section is currently below the Secure threshold") + ".</p>" +
      '<h3>Section performance</h3><ul class="performance-list">' + rows + "</ul>" +
      '<p class="activity-note">Secure, Developing and Needs Review are learning indicators for this activity. They are not Pearson grades.</p>' +
      '<div class="activity-actions"><button class="primary-button" type="button" data-action="restart-activity">Retry the full activity</button>' +
      '<a class="secondary-button" href="../">Back to Foundations</a></div></section>';
    bindEvents();
    focusHeading("#results-heading");
  }

  function collectQuestionResponse(question, panel) {
    if (question.type === "multiple") {
      return Array.from(panel.querySelectorAll('input[name="' + question.id + '"]:checked')).map(function (input) {
        return input.value;
      });
    }

    if (question.type === "single") {
      var selected = panel.querySelector('input[name="' + question.id + '"]:checked');
      return selected ? selected.value : "";
    }

    if (question.type === "text") {
      var input = panel.querySelector('input[name="' + question.id + '"]');
      return input ? input.value.trim() : "";
    }

    if (question.type === "matching") {
      var matched = {};
      panel.querySelectorAll("[data-match-row]").forEach(function (select) {
        matched[select.dataset.matchRow] = select.value;
      });
      return matched;
    }

    if (question.type === "order") {
      var positioned = [];
      var valid = true;
      panel.querySelectorAll("[data-order-item]").forEach(function (select) {
        var position = Number(select.value);
        if (!position || positioned[position - 1]) {
          valid = false;
          return;
        }
        positioned[position - 1] = select.dataset.orderItem;
      });
      return valid && positioned.length === question.items.length ? positioned : [];
    }

    return "";
  }

  function collectCurrentResponses() {
    var section = activity.sections[currentIndex];
    section.questions.forEach(function (question) {
      var panel = mount.querySelector('[data-question-id="' + question.id + '"]');
      if (panel) {
        attempt.responses[question.id] = collectQuestionResponse(question, panel);
      }
    });
    attempt.currentSectionId = section.id;
    store.save(attempt);
  }

  function showSubmissionError(unanswered) {
    var error = mount.querySelector("[data-activity-error]");
    error.textContent = "Complete every question before submitting this section. " + unanswered.length +
      (unanswered.length === 1 ? " question needs" : " questions need") + " an answer.";
    error.hidden = false;
    unanswered.forEach(function (question) {
      var panel = mount.querySelector('[data-question-id="' + question.id + '"]');
      if (panel) {
        panel.classList.add("question-panel--error");
      }
    });
    error.focus();
  }

  function submitSection(event) {
    event.preventDefault();
    var section = activity.sections[currentIndex];
    collectCurrentResponses();
    var unanswered = section.questions.filter(function (question) {
      return !marking.hasResponse(question, attempt.responses[question.id]);
    });
    if (unanswered.length) {
      showSubmissionError(unanswered);
      return;
    }

    if (attempt.submittedSections.indexOf(section.id) === -1) {
      attempt.submittedSections.push(section.id);
    }

    if (attempt.submittedSections.length === activity.sections.length) {
      attempt.result = marking.createResult(activity, attempt);
    }
    store.save(attempt);

    if (attempt.result) {
      renderResults();
      return;
    }

    renderSection();
    var summary = mount.querySelector("[data-section-summary]");
    if (summary) {
      summary.focus();
    }
  }

  function changeSection(sectionId) {
    if (!attempt.result) {
      collectCurrentResponses();
    }
    var nextIndex = activity.sections.findIndex(function (section) {
      return section.id === sectionId;
    });
    if (nextIndex === -1) {
      return;
    }
    currentIndex = nextIndex;
    attempt.currentSectionId = sectionId;
    store.save(attempt);
    renderSection();
    focusHeading("#section-heading");
  }

  function retrySection() {
    var section = activity.sections[currentIndex];
    section.questions.forEach(function (question) {
      delete attempt.responses[question.id];
    });
    attempt.submittedSections = attempt.submittedSections.filter(function (sectionId) {
      return sectionId !== section.id;
    });
    attempt.result = null;
    store.save(attempt);
    renderSection();
    focusHeading("#section-heading");
  }

  function restartActivity() {
    if (typeof window.confirm === "function" && !window.confirm("Restart this activity and clear this browser's saved attempt?")) {
      return;
    }
    attempt = store.reset();
    currentIndex = 0;
    renderSection();
    focusHeading("#section-heading");
  }

  function focusHeading(selector) {
    window.setTimeout(function () {
      var heading = mount.querySelector(selector);
      if (heading) {
        heading.focus();
      }
    }, 0);
  }

  function bindEvents() {
    var form = mount.querySelector("[data-activity-form]");
    if (form) {
      form.addEventListener("submit", submitSection);
      form.addEventListener("change", function () {
        collectCurrentResponses();
        var error = mount.querySelector("[data-activity-error]");
        if (error) {
          error.hidden = true;
        }
      });
    }

    mount.querySelectorAll("[data-action]").forEach(function (control) {
      control.addEventListener("click", function () {
        var action = control.dataset.action;
        if (action === "go-section" || action === "review-section") {
          changeSection(control.dataset.sectionId);
        } else if (action === "previous-section") {
          changeSection(activity.sections[currentIndex - 1].id);
        } else if (action === "next-section") {
          changeSection(activity.sections[currentIndex + 1].id);
        } else if (action === "retry-section") {
          retrySection();
        } else if (action === "restart-activity") {
          restartActivity();
        } else if (action === "show-results") {
          renderResults();
        }
      });
    });
  }

  function initialise() {
    mount = document.querySelector("[data-foundation-activity]");
    if (!mount) {
      return;
    }

    var errors = marking.validateActivity(activity);
    if (errors.length) {
      mount.innerHTML = '<p class="activity-load-error" role="alert">This activity could not be loaded. Please return to Foundations and try again.</p>';
      return;
    }

    store = stateService.createStore(activity);
    attempt = store.start();
    currentIndex = Math.max(0, activity.sections.findIndex(function (section) {
      return section.id === attempt.currentSectionId;
    }));

    if (attempt.result) {
      renderResults();
    } else {
      renderSection();
    }
  }

  utils.onReady(initialise);

  window.FoundationActivityEngine = Object.freeze({
    initialise: initialise,
    questionById: questionById,
    sectionById: sectionById
  });
})();
