(function () {
  "use strict";

  var supportedTypes = Object.freeze([
    "predict-output",
    "code-gap",
    "line-select",
    "code-order",
    "code-editor"
  ]);

  function supports(question) {
    return Boolean(question) && supportedTypes.indexOf(question.type) !== -1;
  }

  function normaliseLines(value) {
    return String(value == null ? "" : value)
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+$/gm, "")
      .replace(/^\s*\n+|\n+\s*$/g, "");
  }

  function normaliseOutput(value, caseSensitive) {
    var normalised = normaliseLines(value)
      .split("\n")
      .map(function (line) { return line.trim().replace(/\s+/g, " "); })
      .join("\n");
    return caseSensitive === false ? normalised.toLowerCase() : normalised;
  }

  function normaliseCode(value) {
    return normaliseLines(value)
      .split("\n")
      .map(function (line) {
        var indentation = (line.match(/^\s*/) || [""])[0].replace(/\t/g, "    ");
        var content = line.trim().replace(/[ \t]+/g, " ");
        return indentation + content;
      })
      .join("\n");
  }

  function matchesAccepted(response, accepted, normaliser) {
    var value = normaliser(response);
    return (accepted || []).some(function (answer) {
      return value === normaliser(answer);
    });
  }

  function patternMatches(source, rule) {
    var pattern = typeof rule === "string" ? rule : rule.pattern;
    var flags = typeof rule === "string" ? "" : (rule.flags || "");
    return new RegExp(pattern, flags).test(source);
  }

  function markCode(question, response) {
    var source = normaliseCode(response);
    var accepted = question.accepted || question.answers || [];
    var exactMatch = matchesAccepted(source, accepted, normaliseCode);
    var rules = question.rules || {};
    var required = rules.required || [];
    var prohibited = rules.prohibited || [];
    var hasRules = required.length > 0 || prohibited.length > 0;
    var missingRequired = required.filter(function (rule) {
      return !patternMatches(source, rule);
    });
    var foundProhibited = prohibited.filter(function (rule) {
      return patternMatches(source, rule);
    });
    var ruleMatch = hasRules && missingRequired.length === 0 && foundProhibited.length === 0;

    return {
      correct: exactMatch || ruleMatch,
      detail: missingRequired.length || foundProhibited.length
        ? "The solution is close, but one required construct is missing or an incorrect construct remains."
        : "The required structure is present."
    };
  }

  function mark(question, response) {
    if (!supports(question)) {
      return { correct: false, detail: "Unsupported programming exercise." };
    }

    if (question.type === "code-order") {
      return {
        correct: Array.isArray(response) && Array.isArray(question.answer) &&
          response.length === question.answer.length && response.every(function (item, index) {
            return item === question.answer[index];
          }),
        detail: "Compare the initialise, check, process and update sequence."
      };
    }

    if (question.type === "line-select") {
      return {
        correct: String(response) === String(question.answer),
        detail: "Use the line number and the explanation to trace the fault."
      };
    }

    if (question.type === "predict-output") {
      return {
        correct: matchesAccepted(response, question.answers, function (value) {
          return normaliseOutput(value, question.caseSensitive);
        }),
        detail: "Trace the statements in order and record only what is output."
      };
    }

    if (question.type === "code-gap") {
      return {
        correct: matchesAccepted(response, question.answers, function (value) {
          return normaliseOutput(value, question.caseSensitive);
        }),
        detail: "Check the exact operator, expression or statement needed in the gap."
      };
    }

    return markCode(question, response);
  }

  function hasResponse(question, response) {
    if (question.type === "code-order") {
      return Array.isArray(response) && response.length === question.items.length;
    }
    return typeof response === "string" && response.trim() !== "";
  }

  window.FoundationProgrammingChecker = Object.freeze({
    supportedTypes: supportedTypes,
    supports: supports,
    normaliseCodeResponse: normaliseCode,
    normaliseOutput: normaliseOutput,
    hasResponse: hasResponse,
    mark: mark
  });
})();
