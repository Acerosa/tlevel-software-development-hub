(function () {
  "use strict";

  var config = window.STUDENT_API_CONFIG;
  var studentContext = window.StudentContext;

  function LearningApiError(code) {
    this.name = "LearningApiError";
    this.code = code || "INTERNAL_ERROR";
    this.message = "The learning record service could not complete the request.";
  }

  LearningApiError.prototype = Object.create(Error.prototype);
  LearningApiError.prototype.constructor = LearningApiError;

  function requireApiUrl() {
    var apiUrl = config && typeof config.apiUrl === "string"
      ? config.apiUrl.trim()
      : "";
    if (!apiUrl) {
      throw new LearningApiError("CONFIGURATION_ERROR");
    }
    return apiUrl;
  }

  function requireStudentId() {
    var studentId = studentContext && studentContext.getStudentId
      ? studentContext.getStudentId()
      : null;
    if (typeof studentId !== "string" || !studentId.trim()) {
      throw new LearningApiError("SIGN_IN_REQUIRED");
    }
    return studentId.trim();
  }

  function resultPayload(result) {
    var valid = result && typeof result === "object" &&
      typeof result.activityId === "string" && result.activityId.trim() &&
      typeof result.activityVersion === "string" && result.activityVersion.trim() &&
      typeof result.attemptId === "string" && result.attemptId.trim() &&
      Number.isInteger(result.score) && Number.isInteger(result.maxScore);

    if (!valid) {
      throw new LearningApiError("VALIDATION_FAILED");
    }

    return {
      activityId: result.activityId.trim(),
      activityVersion: result.activityVersion.trim(),
      attemptId: result.attemptId.trim(),
      score: result.score,
      maxScore: result.maxScore
    };
  }

  function safeSubmission(payload) {
    var submission = payload && payload.data ? payload.data.submission : null;
    var valid = submission &&
      typeof submission.attemptId === "string" && submission.attemptId &&
      typeof submission.activityId === "string" && submission.activityId &&
      Number.isInteger(submission.attemptNumber) &&
      typeof submission.score === "number" &&
      typeof submission.maxScore === "number" &&
      typeof submission.percentage === "number" &&
      typeof submission.status === "string" &&
      typeof submission.submittedAt === "string" &&
      typeof submission.duplicate === "boolean";

    if (!valid) {
      throw new LearningApiError("INVALID_RESPONSE");
    }

    return {
      attemptId: submission.attemptId,
      activityId: submission.activityId,
      attemptNumber: submission.attemptNumber,
      score: submission.score,
      maxScore: submission.maxScore,
      percentage: submission.percentage,
      status: submission.status,
      submittedAt: submission.submittedAt,
      duplicate: submission.duplicate
    };
  }

  function parseResponse(response) {
    if (!response || !response.ok) {
      throw new LearningApiError("NETWORK_ERROR");
    }

    return response.text().then(function (text) {
      var payload;
      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw new LearningApiError("INVALID_RESPONSE");
      }

      if (!payload || typeof payload !== "object") {
        throw new LearningApiError("INVALID_RESPONSE");
      }
      if (payload.success !== true) {
        throw new LearningApiError(
          typeof payload.error === "string" ? payload.error : "INTERNAL_ERROR"
        );
      }
      return safeSubmission(payload);
    });
  }

  function submitResult(result) {
    var apiUrl;
    var studentId;
    var submittedResult;

    try {
      apiUrl = requireApiUrl();
      studentId = requireStudentId();
      submittedResult = resultPayload(result);
    } catch (error) {
      return Promise.reject(error);
    }

    var controller = typeof AbortController === "function"
      ? new AbortController()
      : null;
    var timeout = window.setTimeout(function () {
      if (controller) {
        controller.abort();
      }
    }, config.requestTimeoutMs || 15000);

    return window.fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "submitResult",
        studentId: studentId,
        result: submittedResult,
        sourcePage: window.location && window.location.pathname
          ? window.location.pathname
          : ""
      }),
      signal: controller ? controller.signal : undefined
    }).then(parseResponse).catch(function (error) {
      if (error && error.name === "LearningApiError") {
        throw error;
      }
      throw new LearningApiError("NETWORK_ERROR");
    }).then(function (submission) {
      window.clearTimeout(timeout);
      return submission;
    }, function (error) {
      window.clearTimeout(timeout);
      throw error;
    });
  }

  window.LearningApi = Object.freeze({
    submitResult: submitResult
  });
})();
