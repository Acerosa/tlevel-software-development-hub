(function () {
  "use strict";

  var config = window.STUDENT_API_CONFIG;

  function StudentApiError(code) {
    this.name = "StudentApiError";
    this.code = code || "INTERNAL_ERROR";
    this.message = "The student service could not complete the request.";
  }

  StudentApiError.prototype = Object.create(Error.prototype);
  StudentApiError.prototype.constructor = StudentApiError;

  function requireStudentId(value) {
    if (typeof value !== "string") {
      throw new StudentApiError("INVALID_STUDENT_ID");
    }

    var studentId = value.trim();
    if (!studentId) {
      throw new StudentApiError("INVALID_STUDENT_ID");
    }

    return studentId;
  }

  function requireApiUrl() {
    var apiUrl = config && typeof config.apiUrl === "string"
      ? config.apiUrl.trim()
      : "";

    if (!apiUrl) {
      throw new StudentApiError("CONFIGURATION_ERROR");
    }

    return apiUrl;
  }

  function safeStudentProfile(payload) {
    var student = payload && payload.data ? payload.data.student : null;
    var requiredFields = ["studentId", "firstName", "displayName", "group"];
    var valid = student && requiredFields.every(function (field) {
      return typeof student[field] === "string";
    });

    if (!valid || !student.studentId.trim() || !student.firstName.trim()) {
      throw new StudentApiError("INVALID_RESPONSE");
    }

    return {
      studentId: student.studentId.trim(),
      firstName: student.firstName.trim(),
      displayName: student.displayName.trim(),
      group: student.group.trim()
    };
  }

  function parseResponse(response) {
    if (!response || !response.ok) {
      throw new StudentApiError("NETWORK_ERROR");
    }

    return response.text().then(function (text) {
      var payload;

      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw new StudentApiError("INVALID_RESPONSE");
      }

      if (!payload || typeof payload !== "object") {
        throw new StudentApiError("INVALID_RESPONSE");
      }

      if (payload.success !== true) {
        throw new StudentApiError(
          typeof payload.error === "string" ? payload.error : "INTERNAL_ERROR"
        );
      }

      return safeStudentProfile(payload);
    });
  }

  function getStudent(studentId) {
    var normalisedId;
    var apiUrl;

    try {
      normalisedId = requireStudentId(studentId);
      apiUrl = requireApiUrl();
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
        action: "getStudent",
        studentId: normalisedId
      }),
      signal: controller ? controller.signal : undefined
    }).then(parseResponse).catch(function (error) {
      if (error && error.name === "StudentApiError") {
        throw error;
      }

      throw new StudentApiError("NETWORK_ERROR");
    }).then(function (student) {
      window.clearTimeout(timeout);
      return student;
    }, function (error) {
      window.clearTimeout(timeout);
      throw error;
    });
  }

  window.StudentApi = Object.freeze({
    getStudent: getStudent
  });
})();
