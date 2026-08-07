(function () {
  "use strict";

  var sessionService = window.StudentSession;
  var restoredStudent = sessionService.getStudentSession();
  var currentStudent = restoredStudent ? Object.freeze(restoredStudent) : null;
  var listeners = [];

  function notify() {
    listeners.slice().forEach(function (listener) {
      listener(currentStudent);
    });
  }

  function getCurrentStudent() {
    return currentStudent;
  }

  function getStudentId() {
    return currentStudent ? currentStudent.studentId : null;
  }

  function isSignedIn() {
    return Boolean(currentStudent);
  }

  function signIn(student) {
    var session = sessionService.saveStudentSession(student);
    if (!session) {
      var error = new Error("Student session could not be saved.");
      error.code = "SESSION_STORAGE_ERROR";
      throw error;
    }

    currentStudent = Object.freeze(session);
    notify();
    return currentStudent;
  }

  function signOut() {
    sessionService.clearStudentSession();
    currentStudent = null;
    notify();
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      return function () {};
    }

    listeners.push(listener);
    listener(currentStudent);

    return function () {
      listeners = listeners.filter(function (candidate) {
        return candidate !== listener;
      });
    };
  }

  window.StudentContext = Object.freeze({
    getCurrentStudent: getCurrentStudent,
    getStudentId: getStudentId,
    isSignedIn: isSignedIn,
    signIn: signIn,
    signOut: signOut,
    subscribe: subscribe
  });
})();
