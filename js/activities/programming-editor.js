(function () {
  "use strict";

  var checker = window.FoundationProgrammingChecker;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function supports(question) {
    return checker && checker.supports(question);
  }

  function codeLines(code, extraClass) {
    var lines = String(code || "").replace(/\r\n?/g, "\n").split("\n");
    return '<pre class="code-sample programming-code ' + (extraClass || "") +
      '" tabindex="0" aria-label="Code sample"><code>' + lines.map(function (line, index) {
        return '<span class="programming-code__line"><span class="programming-code__number" aria-hidden="true">' +
          (index + 1) + '</span><span class="programming-code__text">' +
          (escapeHtml(line) || "&nbsp;") + "</span></span>";
      }).join("") + "</code></pre>";
  }

  function hints(question) {
    return (question.hints || []).map(function (hint, index) {
      return '<details class="programming-hint"><summary>Hint ' + (index + 1) + '</summary><p>' +
        escapeHtml(hint) + "</p></details>";
    }).join("");
  }

  function toolbar(question, submitted, includeReset) {
    var copyLabel = question.type === "code-editor" ? "Copy editor" : "Copy code";
    return '<div class="programming-workbench__toolbar"><span class="programming-language-badge">' +
      escapeHtml(question.languageLabel || "SQL") + '</span><div class="programming-workbench__tools">' +
      '<button class="code-tool-button" type="button" data-programming-action="copy">' + copyLabel + "</button>" +
      (!submitted && includeReset
        ? '<button class="code-tool-button" type="button" data-programming-action="reset">Reset</button>'
        : "") + "</div></div>";
  }

  function controls(submitted) {
    if (submitted) {
      return "";
    }
    return '<div class="programming-workbench__actions"><button class="secondary-button" type="button" ' +
      'data-programming-action="check">Check solution</button>' +
      '<span class="keyboard-hint">Ctrl/⌘ + Enter</span></div>';
  }

  function outputAnswer(question, response, submitted) {
    var id = "programming-response-" + question.id;
    var value = response == null ? "" : response;
    if (question.multiline) {
      return '<label class="programming-response-label" for="' + escapeHtml(id) + '">Your predicted output</label>' +
        '<textarea class="programming-output" id="' + escapeHtml(id) + '" data-programming-response rows="3" ' +
        (submitted ? "disabled" : "") + ' spellcheck="false">' + escapeHtml(value) + "</textarea>";
    }
    return '<label class="programming-response-label" for="' + escapeHtml(id) + '">Your predicted output</label>' +
      '<input class="programming-output" id="' + escapeHtml(id) + '" data-programming-response type="text" ' +
      'autocomplete="off" spellcheck="false" value="' + escapeHtml(value) + '" ' +
      (submitted ? "disabled" : "") + ">";
  }

  function gapAnswer(question, response, submitted) {
    var id = "programming-response-" + question.id;
    return '<div class="code-gap" role="group" aria-label="Complete the code gap"><pre tabindex="0"><code>' +
      '<span>' + escapeHtml(question.beforeGap || "") + '</span><label class="code-gap__label" for="' +
      escapeHtml(id) + '"><span class="visually-hidden">Code for the blank</span><input id="' +
      escapeHtml(id) + '" data-programming-response class="code-gap__input" type="text" autocomplete="off" ' +
      'spellcheck="false" value="' + escapeHtml(response || "") + '" size="' +
      Math.max(5, Number(question.gapWidth) || 12) + '" ' + (submitted ? "disabled" : "") +
      '></label><span>' + escapeHtml(question.afterGap || "") + "</span></code></pre></div>";
  }

  function lineSelectAnswer(question, response, submitted) {
    return '<div class="code-line-selector" role="radiogroup" aria-label="Select the incorrect line">' +
      String(question.code || "").replace(/\r\n?/g, "\n").split("\n").map(function (line, index) {
        var lineNumber = String(index + 1);
        var selected = String(response || "") === lineNumber;
        var reviewClass = "";
        if (submitted && lineNumber === String(question.answer)) {
          reviewClass = " code-line-choice--answer";
        } else if (submitted && selected) {
          reviewClass = " code-line-choice--selected-incorrect";
        }
        return '<label class="code-line-choice' + reviewClass + '"><input type="radio" name="' +
          escapeHtml(question.id) + '" data-programming-response value="' + lineNumber + '" ' +
          (selected ? "checked " : "") + (submitted ? "disabled" : "") + '><span class="code-line-choice__number">' +
          lineNumber + '</span><code>' + (escapeHtml(line) || "&nbsp;") + "</code></label>";
      }).join("") + "</div>";
  }

  function orderAnswer(question, response, submitted) {
    var order = Array.isArray(response) && response.length ? response : question.initialOrder;
    var byId = question.items.reduce(function (result, item) {
      result[item.id] = item;
      return result;
    }, {});
    return '<ol class="code-order" data-code-order aria-label="Code lines in current order">' +
      order.map(function (itemId, index) {
        var item = byId[itemId];
        return '<li class="code-order__item" data-code-order-id="' + escapeHtml(item.id) + '">' +
          '<span class="code-order__position" aria-hidden="true">' + (index + 1) + '</span><code>' +
          escapeHtml(item.code) + '</code><span class="code-order__controls">' +
          '<button class="code-move-button" type="button" data-programming-action="move-up" aria-label="Move ' +
          escapeHtml(item.label || item.code) + ' up" ' + (submitted || index === 0 ? "disabled" : "") +
          '>↑ <span>Up</span></button><button class="code-move-button" type="button" data-programming-action="move-down" aria-label="Move ' +
          escapeHtml(item.label || item.code) + ' down" ' +
          (submitted || index === order.length - 1 ? "disabled" : "") + '>↓ <span>Down</span></button></span></li>';
      }).join("") + "</ol>";
  }

  function editorAnswer(question, response, submitted) {
    var id = "programming-response-" + question.id;
    var value = typeof response === "string" ? response : (question.starterCode || "");
    return '<label class="programming-response-label" for="' + escapeHtml(id) + '">Code editor</label>' +
      '<textarea class="programming-editor" id="' + escapeHtml(id) + '" data-programming-response rows="' +
      Math.max(5, Number(question.editorRows) || 7) + '" wrap="off" spellcheck="false" autocapitalize="off" ' +
      'autocomplete="off" ' + (submitted ? "disabled" : "") + ' aria-describedby="' + escapeHtml(id) +
      '-help">' + escapeHtml(value) + '</textarea><p class="programming-editor-help" id="' +
      escapeHtml(id) + '-help">Write only the requested code. This activity checks known structures and does not run your code.</p>';
  }

  function render(question, response, submitted) {
    var answer = "";
    var display = "";
    if (question.type === "predict-output") {
      display = codeLines(question.code);
      answer = outputAnswer(question, response, submitted);
    } else if (question.type === "code-gap") {
      answer = gapAnswer(question, response, submitted);
    } else if (question.type === "line-select") {
      answer = lineSelectAnswer(question, response, submitted);
    } else if (question.type === "code-order") {
      answer = orderAnswer(question, response, submitted);
    } else if (question.type === "code-editor") {
      answer = editorAnswer(question, response, submitted);
    }

    return '<div class="programming-workbench" data-programming-workbench data-programming-type="' +
      escapeHtml(question.type) + '">' + toolbar(question, submitted, true) + display + answer +
      controls(submitted) + '<div class="programming-workbench__feedback" data-programming-feedback aria-live="polite"></div>' +
      '<span class="copy-status" data-copy-status aria-live="polite"></span></div>' + hints(question);
  }

  function collect(question, panel) {
    if (question.type === "code-order") {
      return Array.from(panel.querySelectorAll("[data-code-order-id]")).map(function (item) {
        return item.dataset.codeOrderId;
      });
    }
    if (question.type === "line-select") {
      var selected = panel.querySelector("[data-programming-response]:checked");
      return selected ? selected.value : "";
    }
    var input = panel.querySelector("[data-programming-response]");
    return input ? input.value : "";
  }

  function refreshOrderControls(list) {
    var items = Array.from(list.querySelectorAll("[data-code-order-id]"));
    items.forEach(function (item, index) {
      item.querySelector(".code-order__position").textContent = index + 1;
      item.querySelector('[data-programming-action="move-up"]').disabled = index === 0;
      item.querySelector('[data-programming-action="move-down"]').disabled = index === items.length - 1;
    });
  }

  function reset(question, panel) {
    var input;
    if (question.type === "code-order") {
      var list = panel.querySelector("[data-code-order]");
      question.initialOrder.forEach(function (itemId) {
        list.appendChild(list.querySelector('[data-code-order-id="' + itemId + '"]'));
      });
      refreshOrderControls(list);
      return;
    }
    if (question.type === "line-select") {
      input = panel.querySelector("[data-programming-response]:checked");
      if (input) {
        input.checked = false;
      }
      return;
    }
    input = panel.querySelector("[data-programming-response]");
    if (input) {
      input.value = question.type === "code-editor" ? (question.starterCode || "") : "";
    }
  }

  function copyText(question, panel) {
    if (question.type === "code-editor") {
      return collect(question, panel);
    }
    if (question.type === "code-gap") {
      return (question.beforeGap || "") + collect(question, panel) + (question.afterGap || "");
    }
    if (question.type === "code-order") {
      var byId = question.items.reduce(function (result, item) {
        result[item.id] = item.code;
        return result;
      }, {});
      return collect(question, panel).map(function (itemId) { return byId[itemId]; }).join("\n");
    }
    return question.code || "";
  }

  function announceCopy(panel, message) {
    var status = panel.querySelector("[data-copy-status]");
    if (status) {
      status.textContent = message;
    }
  }

  function bind(question, panel, callbacks) {
    var settings = callbacks || {};
    panel.querySelectorAll("[data-programming-response]").forEach(function (input) {
      input.addEventListener(input.type === "radio" ? "change" : "input", function () {
        if (settings.onChange) {
          settings.onChange();
        }
      });
      input.addEventListener("keydown", function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          if (settings.onCheck) {
            settings.onCheck(collect(question, panel), panel.querySelector("[data-programming-feedback]"));
          }
        }
      });
    });

    panel.querySelectorAll("[data-programming-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        var action = button.dataset.programmingAction;
        if (action === "check" && settings.onCheck) {
          settings.onCheck(collect(question, panel), panel.querySelector("[data-programming-feedback]"));
          return;
        }
        if (action === "reset") {
          reset(question, panel);
          panel.querySelector("[data-programming-feedback]").innerHTML = "";
          if (settings.onChange) {
            settings.onChange();
          }
          var responseControl = panel.querySelector("[data-programming-response]");
          if (responseControl) {
            responseControl.focus();
          }
          return;
        }
        if (action === "copy") {
          if (window.navigator && window.navigator.clipboard && window.navigator.clipboard.writeText) {
            window.navigator.clipboard.writeText(copyText(question, panel)).then(function () {
              announceCopy(panel, "Copied.");
            }).catch(function () {
              announceCopy(panel, "Copy was unavailable. Select the code manually.");
            });
          } else {
            announceCopy(panel, "Copy was unavailable. Select the code manually.");
          }
          return;
        }
        if (action === "move-up" || action === "move-down") {
          var item = button.closest("[data-code-order-id]");
          var list = item.parentElement;
          if (action === "move-up" && item.previousElementSibling) {
            list.insertBefore(item, item.previousElementSibling);
          } else if (action === "move-down" && item.nextElementSibling) {
            list.insertBefore(item.nextElementSibling, item);
          }
          refreshOrderControls(list);
          if (settings.onChange) {
            settings.onChange();
          }
          button.focus();
        }
      });
    });
  }

  window.FoundationProgrammingEditor = Object.freeze({
    supports: supports,
    render: render,
    collect: collect,
    bind: bind
  });
})();
