(function () {
  "use strict";

  function normaliseText(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[.;]+$/, "");
  }

  function arraysMatch(left, right) {
    return Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every(function (value, index) {
        return value === right[index];
      });
  }

  function setsMatch(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    var leftValues = left.slice().sort();
    var rightValues = right.slice().sort();
    return arraysMatch(leftValues, rightValues);
  }

  function objectsMatch(left, right) {
    if (!left || !right || typeof left !== "object" || typeof right !== "object") {
      return false;
    }

    var keys = Object.keys(right);
    return keys.length === Object.keys(left).length && keys.every(function (key) {
      return left[key] === right[key];
    });
  }

  function hasResponse(question, response) {
    if (question.type === "multiple" || question.type === "order") {
      return Array.isArray(response) && response.length > 0;
    }

    if (question.type === "matching") {
      return Boolean(response) &&
        typeof response === "object" &&
        Object.keys(question.answer).every(function (key) {
          return typeof response[key] === "string" && response[key] !== "";
        });
    }

    return typeof response === "string" && response.trim() !== "";
  }

  function isCorrect(question, response) {
    if (!hasResponse(question, response)) {
      return false;
    }

    if (question.type === "multiple") {
      return setsMatch(response, question.answer);
    }

    if (question.type === "order") {
      return arraysMatch(response, question.answer);
    }

    if (question.type === "matching") {
      return objectsMatch(response, question.answer);
    }

    if (question.type === "text") {
      return question.answers.some(function (answer) {
        return normaliseText(answer) === normaliseText(response);
      });
    }

    return response === question.answer;
  }

  function markQuestion(question, response) {
    var correct = isCorrect(question, response);
    var maxScore = Number.isFinite(question.points) ? question.points : 1;
    var feedback = question.feedback || {};

    return {
      questionId: question.id,
      response: response,
      correct: correct,
      score: correct ? maxScore : 0,
      maxScore: maxScore,
      feedback: correct ? feedback.correct : feedback.incorrect
    };
  }

  function percentage(score, maxScore) {
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  function statusForPercentage(value) {
    if (value >= 80) {
      return "Secure";
    }

    if (value >= 50) {
      return "Developing";
    }

    return "Needs Review";
  }

  function markSection(section, responses) {
    var marked = section.questions.map(function (question) {
      return markQuestion(question, responses[question.id]);
    });
    var score = marked.reduce(function (total, item) { return total + item.score; }, 0);
    var maxScore = marked.reduce(function (total, item) { return total + item.maxScore; }, 0);
    var sectionPercentage = percentage(score, maxScore);

    return {
      sectionId: section.id,
      title: section.title,
      score: score,
      maxScore: maxScore,
      percentage: sectionPercentage,
      status: statusForPercentage(sectionPercentage),
      responses: marked
    };
  }

  function createResult(activity, attempt, completedAt) {
    var sectionResults = activity.sections.map(function (section) {
      return markSection(section, attempt.responses || {});
    });
    var score = sectionResults.reduce(function (total, section) {
      return total + section.score;
    }, 0);
    var maxScore = sectionResults.reduce(function (total, section) {
      return total + section.maxScore;
    }, 0);

    return {
      activityId: activity.id,
      activityVersion: activity.version,
      attemptId: attempt.attemptId,
      startedAt: attempt.startedAt,
      completedAt: completedAt || new Date().toISOString(),
      score: score,
      maxScore: maxScore,
      percentage: percentage(score, maxScore),
      sections: sectionResults.map(function (section) {
        return {
          sectionId: section.sectionId,
          title: section.title,
          score: section.score,
          maxScore: section.maxScore,
          percentage: section.percentage,
          status: section.status
        };
      }),
      responses: sectionResults.reduce(function (all, section) {
        return all.concat(section.responses.map(function (response) {
          return {
            questionId: response.questionId,
            sectionId: section.sectionId,
            response: response.response,
            correct: response.correct,
            score: response.score,
            maxScore: response.maxScore
          };
        }));
      }, [])
    };
  }

  function validateActivity(activity) {
    var errors = [];
    var ids = Object.create(null);
    var supportedTypes = ["single", "multiple", "text", "matching", "order"];

    if (!activity || typeof activity !== "object") {
      return ["Activity data is missing."];
    }

    if (!activity.id || !activity.version || !Array.isArray(activity.sections)) {
      errors.push("Activity metadata is incomplete.");
      return errors;
    }

    activity.sections.forEach(function (section) {
      if (!section.id || !section.title || !Array.isArray(section.questions)) {
        errors.push("A section is missing its ID, title or questions.");
        return;
      }

      section.questions.forEach(function (question) {
        if (!question.id || ids[question.id]) {
          errors.push("Question IDs must be present and unique.");
        }
        ids[question.id] = true;

        if (supportedTypes.indexOf(question.type) === -1) {
          errors.push("Unsupported question type for " + question.id + ".");
        }
      });
    });

    return errors;
  }

  window.FoundationActivityMarking = Object.freeze({
    normaliseText: normaliseText,
    hasResponse: hasResponse,
    markQuestion: markQuestion,
    markSection: markSection,
    createResult: createResult,
    statusForPercentage: statusForPercentage,
    validateActivity: validateActivity
  });
})();
