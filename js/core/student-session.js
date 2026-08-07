(function () {
  "use strict";

  var config = window.STUDENT_API_CONFIG;
  var storageKey = config.sessionStorageKey;

  function isValidDate(value) {
    return typeof value === "string" && !Number.isNaN(Date.parse(value));
  }

  function isValidSession(value) {
    return Boolean(
      value &&
      typeof value === "object" &&
      typeof value.studentId === "string" &&
      value.studentId.trim() &&
      typeof value.firstName === "string" &&
      value.firstName.trim() &&
      typeof value.displayName === "string" &&
      typeof value.group === "string" &&
      isValidDate(value.signedInAt)
    );
  }

  function createStudentSession(student) {
    if (!student || typeof student !== "object") {
      throw new Error("INVALID_STUDENT_SESSION");
    }

    var session = {
      studentId: typeof student.studentId === "string" ? student.studentId.trim() : "",
      firstName: typeof student.firstName === "string" ? student.firstName.trim() : "",
      displayName: typeof student.displayName === "string" ? student.displayName.trim() : "",
      group: typeof student.group === "string" ? student.group.trim() : "",
      signedInAt: new Date().toISOString()
    };

    if (!isValidSession(session)) {
      throw new Error("INVALID_STUDENT_SESSION");
    }

    return session;
  }

  function clearStudentSession() {
    try {
      window.localStorage.removeItem(storageKey);
    } catch (error) {
      return false;
    }

    return true;
  }

  function getStudentSession() {
    var stored;

    try {
      stored = window.localStorage.getItem(storageKey);
    } catch (error) {
      return null;
    }

    if (!stored) {
      return null;
    }

    try {
      var session = JSON.parse(stored);
      if (!isValidSession(session)) {
        clearStudentSession();
        return null;
      }

      return {
        studentId: session.studentId.trim(),
        firstName: session.firstName.trim(),
        displayName: session.displayName.trim(),
        group: session.group.trim(),
        signedInAt: session.signedInAt
      };
    } catch (error) {
      clearStudentSession();
      return null;
    }
  }

  function saveStudentSession(student) {
    var session = createStudentSession(student);

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    } catch (error) {
      return null;
    }

    return session;
  }

  function hasStudentSession() {
    return Boolean(getStudentSession());
  }

  window.StudentSession = Object.freeze({
    storageKey: storageKey,
    createStudentSession: createStudentSession,
    getStudentSession: getStudentSession,
    saveStudentSession: saveStudentSession,
    clearStudentSession: clearStudentSession,
    hasStudentSession: hasStudentSession
  });
})();
