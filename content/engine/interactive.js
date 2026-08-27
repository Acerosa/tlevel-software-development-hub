(function (root) {
  "use strict";

  var ns = root.LearningPlatformContent = root.LearningPlatformContent || {};

  function blockById(activity, blockId) {
    return (activity.blocks || []).filter(function (block) { return block.id === blockId; })[0] || null;
  }

  function questionId(block) {
    return (block.content && block.content.questionId) || block.id;
  }

  function isTextResponseType(type) {
    return type === "short-response" || type === "reflection";
  }

  function shouldSkipHtmlBlockBind(blockRoot, type) {
    // React OptionCards / Classification / TextResponse own their UX; do not restore or mark via HTML.
    if (blockRoot.getAttribute("data-lp-block") === "option-cards") return true;
    if (type === "classification" && !blockRoot.querySelector("[data-lp-sort-board]")) return true;
    // React text already mounts char-count / minChars; HTML text does not until enhance runs.
    if (
      (type === "short-response" || type === "reflection") &&
      blockRoot.querySelector("[data-lp-char-count], textarea[data-lp-min-chars]")
    ) {
      return true;
    }
    return false;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function itemLabel(item) {
    return (item && (item.text || item.label)) || "";
  }

  function minCharsFor(block) {
    var content = (block && block.content) || {};
    var type = ns.normaliseBlockType(block && block.type);
    var configured = Number(content.minChars || content.minimumCharacters || 0);
    if (configured > 0) return configured;
    if (type === "reflection") return 500;
    if (type === "short-response") return 200;
    return 0;
  }

  function enhanceTextResponseField(blockRoot, block) {
    var field = blockRoot.querySelector("textarea.lp-textarea[data-lp-response], textarea[data-lp-response]:not(.lp-code)");
    var min;
    var counter;
    var notice;

    if (!field || field.getAttribute("data-lp-text-enhanced") === "true") return;
    if (field.classList.contains("lp-code")) return;

    min = minCharsFor(block);
    if (!min) return;

    field.setAttribute("data-lp-text-enhanced", "true");
    field.setAttribute("data-lp-min-chars", String(min));
    field.setAttribute("minlength", String(min));
    field.setAttribute("autocomplete", "off");

    counter = blockRoot.querySelector("[data-lp-char-count]");
    if (!counter) {
      counter = document.createElement("p");
      counter.className = "lp-char-count";
      counter.setAttribute("data-lp-char-count", "");
      counter.setAttribute("aria-live", "polite");
      field.insertAdjacentElement("afterend", counter);
    }

    notice = blockRoot.querySelector("[data-lp-paste-notice]");
    if (!notice) {
      notice = document.createElement("p");
      notice.className = "lp-paste-notice";
      notice.setAttribute("data-lp-paste-notice", "");
      notice.setAttribute("role", "status");
      counter.insertAdjacentElement("afterend", notice);
    }

    function updateCount() {
      var length = String(field.value || "").trim().length;
      counter.textContent = length + " / " + min + " characters minimum";
      counter.setAttribute("data-lp-met", length >= min ? "true" : "false");
    }

    field.addEventListener("paste", function (event) {
      event.preventDefault();
      notice.textContent = "Paste is disabled. Type your answer in your own words.";
    });

    field.addEventListener("drop", function (event) {
      event.preventDefault();
      notice.textContent = "Dropping text is disabled. Type your answer in your own words.";
    });

    field.addEventListener("input", updateCount);
    updateCount();
  }

  function patchMarkBlockForMinChars() {
    var original = ns.markBlock;
    if (typeof original !== "function" || original.__l2eMinChars) return;

    function patched(block, response) {
      var type = ns.normaliseBlockType(block && block.type);
      var min;
      var text;
      var result;

      if (!isTextResponseType(type)) {
        return original(block, response);
      }

      min = minCharsFor(block);
      text = String(response == null ? "" : response).trim();
      if (min > 0 && text.length < min) {
        return {
          complete: false,
          correct: null,
          feedback: text.length
            ? ("Write at least " + min + " characters. You currently have " + text.length + ".")
            : ("Write at least " + min + " characters before saving.")
        };
      }

      result = original(block, response);
      if (result && result.complete && !result.feedback) {
        result.feedback = ((block.content && block.content.guidance) || "Saved.");
      }
      return result;
    }

    patched.__l2eMinChars = true;
    ns.markBlock = patched;
  }

  function renderClassificationSortHtml(block) {
    var content = block.content || {};
    var questionIdValue = content.questionId || block.id;
    var categories = content.categories || [];
    var items = content.items || [];
    var formative = content.formative === true;
    var columnsHtml;
    var selectsHtml;
    var cardsHtml;

    cardsHtml = items.map(function (item) {
      return '<button type="button" class="lp-sort-card" draggable="true" data-lp-sort-card="' +
        escapeHtml(item.id) + '" aria-pressed="false">' + escapeHtml(itemLabel(item)) + "</button>";
    }).join("");

    columnsHtml = '<div class="lp-sort-column" data-lp-sort-column="pool">' +
      "<h4>Cards to sort</h4>" +
      '<div class="lp-sort-stack" data-lp-sort-stack="pool">' + cardsHtml + "</div></div>" +
      categories.map(function (category) {
        return '<div class="lp-sort-column" data-lp-sort-column="' + escapeHtml(category.id) + '">' +
          "<h4>" + escapeHtml(category.label) + "</h4>" +
          '<div class="lp-sort-stack" data-lp-sort-stack="' + escapeHtml(category.id) + '"></div></div>';
      }).join("");

    selectsHtml = items.map(function (item) {
      var selectId = "lp-class-" + (block.id || questionIdValue) + "-" + item.id;
      var options = ['<option value="">Select a type</option>'].concat(categories.map(function (category) {
        return '<option value="' + escapeHtml(category.id) + '">' + escapeHtml(category.label) + "</option>";
      }));
      return '<div class="lp-classify-item"><label for="' + escapeHtml(selectId) + '">' +
        escapeHtml(itemLabel(item)) + '</label><select id="' + escapeHtml(selectId) +
        '" data-lp-response data-lp-item="' + escapeHtml(item.id) + '">' + options.join("") +
        '</select><span class="lp-item-status" data-lp-item-status="' + escapeHtml(item.id) +
        '" role="status"></span></div>';
    }).join("");

    return '<div class="lp-block lp-block--interactive lp-block--sort" data-lp-block="classification" data-lp-block-id="' +
      escapeHtml(block.id) + '" data-lp-question="' + escapeHtml(questionIdValue) + '"' +
      (formative ? ' data-lp-formative="true"' : "") + ">" +
      '<fieldset class="lp-fieldset"><legend>' + escapeHtml(content.prompt || "Classify each item") + "</legend>" +
      '<p class="lp-sort-note">Drag each card into a column, or select a card then tap a column. You can also use the lists below if needed.</p>' +
      '<div class="lp-sort-board" data-lp-sort-board data-lp-column-count="' +
      escapeHtml(String(categories.length + 1)) + '">' + columnsHtml + "</div>" +
      '<details class="lp-sort-fallback"><summary>Use dropdown lists instead</summary>' +
      '<div class="lp-classify-legacy">' + selectsHtml + "</div></details>" +
      "</fieldset>" +
      '<div class="lp-block-actions"><button type="button" class="lp-button" data-lp-check="' +
      escapeHtml(block.id) + '">Check types</button></div>' +
      '<p class="lp-feedback" data-lp-feedback role="status" aria-live="polite"></p></div>';
  }

  function patchClassificationRender() {
    var original = ns.renderBlock;
    if (typeof original !== "function" || original.__l2eSortCards) return;

    function patched(block, options) {
      if (ns.normaliseBlockType(block && block.type) === "classification") {
        return renderClassificationSortHtml(block);
      }
      return original(block, options);
    }

    patched.__l2eSortCards = true;
    ns.renderBlock = patched;
  }

  function syncSortBoardFromSelects(blockRoot) {
    var board = blockRoot.querySelector("[data-lp-sort-board]");
    if (!board) return;
    Array.prototype.forEach.call(blockRoot.querySelectorAll("[data-lp-item]"), function (select) {
      var itemId = select.getAttribute("data-lp-item");
      var columnId = select.value || "pool";
      var card = board.querySelector('[data-lp-sort-card="' + itemId + '"]');
      var stack = board.querySelector('[data-lp-sort-stack="' + columnId + '"]') ||
        board.querySelector('[data-lp-sort-stack="pool"]');
      if (card && stack && card.parentElement !== stack) {
        stack.appendChild(card);
      }
    });
  }

  function setSortSelectValue(blockRoot, itemId, columnId) {
    var select = blockRoot.querySelector('[data-lp-item="' + itemId + '"]');
    if (!select) return;
    select.value = columnId === "pool" ? "" : columnId;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function clearSortSelection(blockRoot) {
    Array.prototype.forEach.call(blockRoot.querySelectorAll("[data-lp-sort-card]"), function (card) {
      card.classList.remove("lp-sort-card-selected");
      card.setAttribute("aria-pressed", "false");
    });
  }

  function enhanceClassificationBoard(blockRoot) {
    var board = blockRoot.querySelector("[data-lp-sort-board]");
    var selectedId = null;

    if (!board || board.getAttribute("data-lp-sort-bound") === "true") {
      syncSortBoardFromSelects(blockRoot);
      return;
    }

    board.setAttribute("data-lp-sort-bound", "true");

    function moveCard(itemId, columnId) {
      var card = board.querySelector('[data-lp-sort-card="' + itemId + '"]');
      var stack = board.querySelector('[data-lp-sort-stack="' + columnId + '"]');
      if (!card || !stack) return;
      stack.appendChild(card);
      setSortSelectValue(blockRoot, itemId, columnId);
      selectedId = itemId;
      Array.prototype.forEach.call(board.querySelectorAll("[data-lp-sort-card]"), function (node) {
        var active = node.getAttribute("data-lp-sort-card") === itemId;
        node.classList.toggle("lp-sort-card-selected", active);
        node.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    board.addEventListener("dragstart", function (event) {
      var card = event.target && event.target.closest && event.target.closest("[data-lp-sort-card]");
      if (!card || !event.dataTransfer) return;
      selectedId = card.getAttribute("data-lp-sort-card");
      event.dataTransfer.setData("text/plain", selectedId);
      event.dataTransfer.effectAllowed = "move";
      card.classList.add("lp-sort-card-dragging");
    });

    board.addEventListener("dragend", function (event) {
      var card = event.target && event.target.closest && event.target.closest("[data-lp-sort-card]");
      if (card) card.classList.remove("lp-sort-card-dragging");
      Array.prototype.forEach.call(board.querySelectorAll(".lp-sort-column-active"), function (column) {
        column.classList.remove("lp-sort-column-active");
      });
    });

    board.addEventListener("dragover", function (event) {
      var column = event.target && event.target.closest && event.target.closest("[data-lp-sort-column]");
      if (!column) return;
      event.preventDefault();
      column.classList.add("lp-sort-column-active");
    });

    board.addEventListener("dragleave", function (event) {
      var column = event.target && event.target.closest && event.target.closest("[data-lp-sort-column]");
      if (column) column.classList.remove("lp-sort-column-active");
    });

    board.addEventListener("drop", function (event) {
      var column = event.target && event.target.closest && event.target.closest("[data-lp-sort-column]");
      var itemId;
      if (!column) return;
      event.preventDefault();
      column.classList.remove("lp-sort-column-active");
      itemId = event.dataTransfer ? event.dataTransfer.getData("text/plain") : "";
      if (itemId) moveCard(itemId, column.getAttribute("data-lp-sort-column"));
    });

    board.addEventListener("click", function (event) {
      var card = event.target && event.target.closest && event.target.closest("[data-lp-sort-card]");
      var column = event.target && event.target.closest && event.target.closest("[data-lp-sort-column]");
      if (card) {
        selectedId = card.getAttribute("data-lp-sort-card");
        Array.prototype.forEach.call(board.querySelectorAll("[data-lp-sort-card]"), function (node) {
          var active = node === card;
          node.classList.toggle("lp-sort-card-selected", active);
          node.setAttribute("aria-pressed", active ? "true" : "false");
        });
        return;
      }
      if (column && selectedId) {
        moveCard(selectedId, column.getAttribute("data-lp-sort-column"));
      }
    });

    blockRoot.addEventListener("change", function (event) {
      if (!event.target || !event.target.matches || !event.target.matches("[data-lp-item]")) return;
      syncSortBoardFromSelects(blockRoot);
    });

    syncSortBoardFromSelects(blockRoot);
    blockRoot.__lpResetSortBoard = function () {
      clearSortSelection(blockRoot);
      Array.prototype.forEach.call(blockRoot.querySelectorAll("[data-lp-item]"), function (select) {
        select.selectedIndex = 0;
      });
      syncSortBoardFromSelects(blockRoot);
    };
  }

  patchMarkBlockForMinChars();
  patchClassificationRender();

  function collectResponse(blockRoot, block) {
    var type = ns.normaliseBlockType(block.type);
    var selected;
    if (type === "classification") {
      selected = {};
      Array.prototype.forEach.call(blockRoot.querySelectorAll("[data-lp-item]"), function (select) {
        selected[select.getAttribute("data-lp-item")] = select.value;
      });
      return selected;
    }
    if (type === "single-choice") {
      selected = blockRoot.querySelector("[data-lp-response]:checked");
      return selected ? selected.value : "";
    }
    selected = blockRoot.querySelector("[data-lp-response]");
    return selected ? selected.value : "";
  }

  function restoreResponse(blockRoot, block, value) {
    var type = ns.normaliseBlockType(block.type);
    if (value == null) return;
    if (type === "classification" && value && typeof value === "object") {
      Array.prototype.forEach.call(blockRoot.querySelectorAll("[data-lp-item]"), function (select) {
        if (value[select.getAttribute("data-lp-item")]) {
          select.value = value[select.getAttribute("data-lp-item")];
        }
      });
      syncSortBoardFromSelects(blockRoot);
      return;
    }
    if (type === "single-choice") {
      Array.prototype.forEach.call(blockRoot.querySelectorAll("[data-lp-response]"), function (input) {
        input.checked = input.value === String(value);
      });
      return;
    }
    var field = blockRoot.querySelector("[data-lp-response]");
    if (field) field.value = String(value);
  }

  function setFeedback(blockRoot, block, response, checked) {
    var panel = blockRoot.querySelector("[data-lp-feedback]");
    var result;
    if (!panel) return;
    if (!checked) {
      panel.textContent = "";
      blockRoot.removeAttribute("data-lp-result");
      Array.prototype.forEach.call(blockRoot.querySelectorAll("[data-lp-item-status]"), function (statusEl) {
        var row = statusEl.closest(".lp-classify-item");
        statusEl.textContent = "";
        if (row) row.removeAttribute("data-lp-result");
      });
      Array.prototype.forEach.call(blockRoot.querySelectorAll("[data-lp-sort-card]"), function (card) {
        card.removeAttribute("data-lp-result");
      });
      return;
    }
    result = ns.markBlock(block, response);
    panel.textContent = result.feedback || (result.complete ? "Saved." : "Add a response first.");
    if (result.correct === true) blockRoot.setAttribute("data-lp-result", "matched");
    else if (result.correct === false) blockRoot.setAttribute("data-lp-result", "review");
    else blockRoot.setAttribute("data-lp-result", result.complete ? "saved" : "empty");
    Array.prototype.forEach.call(blockRoot.querySelectorAll("[data-lp-item-status]"), function (statusEl) {
      var itemId = statusEl.getAttribute("data-lp-item-status");
      var itemResult = (result.itemResults || []).filter(function (item) { return item.id === itemId; })[0];
      var row = statusEl.closest(".lp-classify-item");
      var card = blockRoot.querySelector('[data-lp-sort-card="' + itemId + '"]');
      if (!itemResult || itemResult.correct == null) {
        statusEl.textContent = "";
        if (row) row.removeAttribute("data-lp-result");
        if (card) card.removeAttribute("data-lp-result");
        return;
      }
      statusEl.textContent = itemResult.correct ? "Matched." : "Review.";
      if (row) row.setAttribute("data-lp-result", itemResult.correct ? "matched" : "review");
      if (card) card.setAttribute("data-lp-result", itemResult.correct ? "matched" : "review");
    });
  }

  function activityInteractiveBlocks(activity) {
    return (activity.blocks || []).filter(function (block) {
      return ns.isInteractiveBlockType(block.type);
    });
  }

  function setActivityNotice(article, message, submitState) {
    var status = article.querySelector("[data-lp-activity-status]");
    if (!status) return;
    status.textContent = message || "";
    if (submitState) status.setAttribute("data-lp-submit-state", submitState);
    else status.removeAttribute("data-lp-submit-state");
  }

  function applySubmissionResult(article, draft, result, persist) {
    if (!result) return;
    draft.submission = {
      status: result.status,
      failed: Boolean(result.failed),
      fingerprint: result.fingerprint || "",
      reason: result.reason || ""
    };
    persist();
    if (result.status === "submitted") {
      setActivityNotice(article, result.reason || "Saved to your learning record.", "submitted");
      return;
    }
    if (result.failed) {
      setActivityNotice(article, result.reason, "local");
    }
  }

  function updateActivityStatus(article, activity, draft) {
    var status = article.querySelector("[data-lp-activity-status]");
    var interactive = activityInteractiveBlocks(activity);
    var complete = interactive.length > 0 && interactive.every(function (block) {
      var result = ns.markBlock(block, draft.responses[questionId(block)]);
      return result.complete;
    });
    draft.completed = complete;
    if (complete && !draft.completedAt) draft.completedAt = new Date().toISOString();
    if (!complete) draft.completedAt = null;
    if (status) {
      if (draft.submission && draft.submission.failed) {
        status.textContent = draft.submission.reason
          || "Your work is still saved on this device. It has not been sent to your learning record yet. You can continue the lesson and try again later.";
        status.setAttribute("data-lp-submit-state", "local");
        return;
      }
      if (draft.submission && draft.submission.status === "submitted") {
        status.textContent = draft.submission.reason || "Saved to your learning record.";
        status.setAttribute("data-lp-submit-state", "submitted");
        return;
      }
      status.removeAttribute("data-lp-submit-state");
      status.textContent = complete
        ? "Practised. This is learning progress, not an assignment grade."
        : (Object.keys(draft.responses).length ? "In progress. Your draft is saved on this device." : "");
    }
  }

  function bindActivity(article, activity, options) {
    var store = ns.createDraftStore(activity, options);
    var draft = store.load();

    function persist() {
      store.save(draft);
      updateActivityStatus(article, activity, draft);
    }

    activityInteractiveBlocks(activity).forEach(function (block) {
      var type = ns.normaliseBlockType(block.type);
      var blockRoot = article.querySelector('[data-lp-block-id="' + block.id + '"]');
      var qid = questionId(block);
      var field;
      if (!blockRoot) return;
      if (shouldSkipHtmlBlockBind(blockRoot, type)) return;
      if (isTextResponseType(type)) {
        enhanceTextResponseField(blockRoot, block);
      }
      if (type === "classification") {
        enhanceClassificationBoard(blockRoot);
      }
      restoreResponse(blockRoot, block, draft.responses[qid]);
      if (draft.checked[qid]) setFeedback(blockRoot, block, draft.responses[qid], true);
      field = blockRoot.querySelector("textarea[data-lp-response]");
      if (field) field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    updateActivityStatus(article, activity, draft);

    article.addEventListener("lp-block-result", function (event) {
      var detail = event.detail || {};
      var qid = detail.questionId;
      if (!qid) return;
      if (detail.completed === false) {
        if (detail.response == null || detail.response === "") delete draft.responses[qid];
        else draft.responses[qid] = detail.response;
        draft.checked[qid] = false;
        persist();
        return;
      }
      draft.responses[qid] = detail.response;
      if (detail.completed) draft.checked[qid] = true;
      persist();
      if (detail.completed) {
        ns.submitActivityDraft(activity, draft, Object.assign({}, options, {
          publication: ns.getPublicationState()
        })).then(function (result) {
          applySubmissionResult(article, draft, result, persist);
        });
      }
    });

    article.addEventListener("change", function (event) {
      var blockRoot = event.target.closest("[data-lp-block-id]");
      var block;
      var qid;
      if (!blockRoot) return;
      block = blockById(activity, blockRoot.getAttribute("data-lp-block-id"));
      if (!block) return;
      qid = questionId(block);
      draft.responses[qid] = collectResponse(blockRoot, block);
      persist();
    });

    article.addEventListener("input", function (event) {
      var blockRoot = event.target.closest("[data-lp-block-id]");
      var block;
      var qid;
      if (!blockRoot || !event.target.matches("[data-lp-response]")) return;
      block = blockById(activity, blockRoot.getAttribute("data-lp-block-id"));
      if (!block) return;
      qid = questionId(block);
      draft.responses[qid] = collectResponse(blockRoot, block);
      persist();
    });

    article.addEventListener("click", function (event) {
      var target = event.target;
      if (target && target.nodeType === 3) target = target.parentElement;
      if (!target || typeof target.closest !== "function") return;

      var checkEl = target.closest("[data-lp-check]");
      var resetBlockEl = target.closest("[data-lp-reset-block]");
      var copyEl = target.closest("[data-lp-copy]");
      var resetActivityEl = target.closest("[data-lp-reset-activity]");
      var checkId = checkEl && checkEl.getAttribute("data-lp-check");
      var resetBlockId = resetBlockEl && resetBlockEl.getAttribute("data-lp-reset-block");
      var copyId = copyEl && copyEl.getAttribute("data-lp-copy");
      var resetActivity = resetActivityEl && resetActivityEl.getAttribute("data-lp-reset-activity");
      var block;
      var blockRoot;
      var qid;
      var field;

      if (checkId) {
        block = blockById(activity, checkId);
        blockRoot = article.querySelector('[data-lp-block-id="' + checkId + '"]');
        if (!block || !blockRoot) return;
        qid = questionId(block);
        draft.responses[qid] = collectResponse(blockRoot, block);
        draft.checked[qid] = true;
        setFeedback(blockRoot, block, draft.responses[qid], true);
        persist();
        ns.submitActivityDraft(activity, draft, Object.assign({}, options, {
          publication: ns.getPublicationState()
        })).then(function (result) {
          applySubmissionResult(article, draft, result, persist);
        });
        return;
      }

      if (resetBlockId) {
        block = blockById(activity, resetBlockId);
        blockRoot = article.querySelector('[data-lp-block-id="' + resetBlockId + '"]');
        field = blockRoot && blockRoot.querySelector("[data-lp-response]");
        if (field) {
          field.value = field.defaultValue;
          qid = questionId(block);
          draft.responses[qid] = field.value;
          draft.checked[qid] = false;
          setFeedback(blockRoot, block, field.value, false);
          persist();
        }
        return;
      }

      if (copyId) {
        field = article.querySelector('[data-lp-block-id="' + copyId + '"] [data-lp-response]');
        if (field && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(field.value);
        }
        return;
      }

      if (resetActivity === activity.id) {
        draft = store.reset();
        activityInteractiveBlocks(activity).forEach(function (item) {
          var rootEl = article.querySelector('[data-lp-block-id="' + item.id + '"]');
          var responseField;
          if (!rootEl) return;
          if (ns.normaliseBlockType(item.type) === "single-choice") {
            Array.prototype.forEach.call(rootEl.querySelectorAll("[data-lp-response]"), function (input) {
              input.checked = false;
            });
          } else if (ns.normaliseBlockType(item.type) === "classification") {
            if (typeof rootEl.__lpResetSortBoard === "function") {
              rootEl.__lpResetSortBoard();
            } else {
              Array.prototype.forEach.call(rootEl.querySelectorAll("[data-lp-item]"), function (select) {
                select.selectedIndex = 0;
              });
            }
          } else {
            responseField = rootEl.querySelector("[data-lp-response]");
            if (responseField) responseField.value = responseField.defaultValue;
          }
          setFeedback(rootEl, item, null, false);
        });
        persist();
      }
    });
  }

  ns.bindInteractive = function (rootEl, pkg, options) {
    if (!rootEl) return;
    Array.prototype.forEach.call(rootEl.querySelectorAll("[data-lp-activity]"), function (article) {
      var activityId = article.getAttribute("data-lp-activity");
      var activity = (pkg.activities || []).filter(function (item) { return item.id === activityId; })[0];
      if (!activity) return;
      if (article.getAttribute("data-lp-bound") === activityId) return;
      article.setAttribute("data-lp-bound", activityId);
      bindActivity(article, activity, options || {});
    });
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
