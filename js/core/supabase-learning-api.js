(function () {
  "use strict";

  var config = window.SUPABASE_CONFIG || {};
  var client = window.SupabaseClient;
  var auth = window.SupabaseAuth;

  function SupabaseLearningError(code, message) {
    this.name = "SupabaseLearningError";
    this.code = code || "SUPABASE_ERROR";
    this.message = message || "The Supabase learning service could not complete the request.";
  }

  SupabaseLearningError.prototype = Object.create(Error.prototype);
  SupabaseLearningError.prototype.constructor = SupabaseLearningError;

  function mappedError(error) {
    var sourceCode = error && error.code ? String(error.code) : "";
    var sourceMessage = error && error.message ? String(error.message) : "";
    if (sourceMessage.indexOf("CLIENT_ATTEMPT_ID_CONFLICT") !== -1 || sourceCode === "23505") {
      return new SupabaseLearningError(
        "ATTEMPT_ID_CONFLICT",
        "This attempt ID already belongs to a different submission. Start a new attempt before retrying."
      );
    }
    if (sourceCode === "42501" || sourceCode === "AUTHENTICATION_REQUIRED") {
      return new SupabaseLearningError("PERMISSION_DENIED", "Your authenticated learner session cannot submit this activity.");
    }
    if (sourceCode === "NETWORK_ERROR") {
      return new SupabaseLearningError("NETWORK_ERROR", "The learning service could not be reached. Your completed work remains saved here.");
    }
    return new SupabaseLearningError(sourceCode || "SERVER_ERROR", sourceMessage || undefined);
  }

  function enabledActivities() {
    return Array.isArray(config.enabledActivities)
      ? Array.from(config.enabledActivities)
      : [];
  }

  function isEnabledFor(activityId) {
    return typeof activityId === "string" &&
      enabledActivities().indexOf(activityId) !== -1;
  }

  function canSubmit(result) {
    return Boolean(
      client &&
      client.isConfigured() &&
      (auth && auth.isAuthenticated
        ? auth.isAuthenticated()
        : client.hasSession && client.hasSession()) &&
      result &&
      isEnabledFor(result.activityId)
    );
  }

  function responseItem(response) {
    var payload = response && response.response;
    var payloadType = Array.isArray(payload) ? "array" : typeof payload;
    var validPayload = payloadType === "string" ||
      payloadType === "array" ||
      (payload && payloadType === "object");
    var valid = response && typeof response.questionId === "string" &&
      response.questionId.trim() && validPayload &&
      typeof response.correct === "boolean" &&
      Number.isFinite(response.score);
    if (!valid) {
      throw new SupabaseLearningError("VALIDATION_FAILED");
    }
    return {
      question_id: response.questionId.trim(),
      response_payload: payload,
      awarded_score: response.score,
      is_correct: response.correct
    };
  }

  function rpcPayload(result) {
    var valid = result && typeof result === "object" &&
      typeof result.activityId === "string" && result.activityId.trim() &&
      typeof result.activityVersion === "string" && result.activityVersion.trim() &&
      typeof result.attemptId === "string" && result.attemptId.trim() &&
      typeof result.startedAt === "string" && !Number.isNaN(Date.parse(result.startedAt)) &&
      typeof result.completedAt === "string" && !Number.isNaN(Date.parse(result.completedAt)) &&
      Array.isArray(result.responses) && result.responses.length > 0;
    if (!valid || !isEnabledFor(result.activityId)) {
      throw new SupabaseLearningError("VALIDATION_FAILED");
    }
    return {
      p_activity_key: result.activityId.trim(),
      p_activity_version: result.activityVersion.trim(),
      p_client_attempt_id: result.attemptId.trim(),
      p_responses: result.responses.map(responseItem),
      p_source_page: window.location && typeof window.location.pathname === "string"
        ? window.location.pathname
        : null,
      p_started_at: result.startedAt,
      p_completed_at: result.completedAt,
      p_programming_language: typeof result.programmingLanguage === "string" &&
        result.programmingLanguage.trim()
        ? result.programmingLanguage.trim()
        : null
    };
  }

  function safeSubmission(payload) {
    var row = Array.isArray(payload) ? payload[0] : null;
    var valid = row &&
      typeof row.client_attempt_id === "string" && row.client_attempt_id &&
      typeof row.activity_key === "string" && row.activity_key &&
      Number.isInteger(row.attempt_number) &&
      typeof row.score === "number" &&
      typeof row.max_score === "number" &&
      typeof row.received_at === "string" &&
      typeof row.idempotent === "boolean";
    if (!valid) {
      throw new SupabaseLearningError("INVALID_RESPONSE");
    }
    return {
      attemptId: row.client_attempt_id,
      activityId: row.activity_key,
      attemptNumber: row.attempt_number,
      score: row.score,
      maxScore: row.max_score,
      percentage: row.max_score > 0
        ? Math.round((row.score / row.max_score) * 10000) / 100
        : 0,
      status: "completed",
      submittedAt: row.received_at,
      duplicate: row.idempotent
    };
  }

  function submitResult(result) {
    var payload;
    try {
      payload = rpcPayload(result);
    } catch (error) {
      return Promise.reject(error);
    }
    if (!canSubmit(result)) {
      return Promise.reject(new SupabaseLearningError("AUTHENTICATION_REQUIRED"));
    }

    return client.request("/rest/v1/rpc/submit_attempt", {
      method: "POST",
      schema: "api",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(safeSubmission).catch(function (error) {
      if (error && error.name === "SupabaseLearningError") {
        throw error;
      }
      throw mappedError(error);
    });
  }

  function getMyActivityProgress() {
    return client.request(
      "/rest/v1/my_activity_progress?select=*",
      { schema: "api" }
    );
  }

  function getMyAttempts() {
    return client.request(
      "/rest/v1/my_attempts?select=*&order=received_at.asc",
      { schema: "api" }
    );
  }

  function getMyAssignments() {
    return client.request(
      "/rest/v1/my_assignments?select=*&order=activity_key.asc",
      { schema: "api" }
    );
  }

  window.SupabaseLearningApi = Object.freeze({
    isEnabledFor: isEnabledFor,
    canSubmit: canSubmit,
    submitResult: submitResult,
    getMyActivityProgress: getMyActivityProgress,
    getMyAttempts: getMyAttempts,
    getMyAssignments: getMyAssignments,
    Error: SupabaseLearningError
  });
})();
