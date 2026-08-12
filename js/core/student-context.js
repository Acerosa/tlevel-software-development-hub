(function () {
  "use strict";

  var platform = window.LearningPlatform && window.LearningPlatform.platform;
  var auth = platform && platform.auth;
  var learner = platform && platform.learner;
  var currentStudent = null;
  var listeners = [];

  if (!auth || !learner) {
    throw new Error("LEARNING_PLATFORM_LEARNER_CONTEXT_UNAVAILABLE");
  }

  function studentFrom(context) {
    if (!context) return null;
    return Object.freeze({
      studentId: context.studentNumber,
      studentNumber: context.studentNumber,
      firstName: context.firstName,
      surname: context.surname,
      fullName: context.fullName,
      displayName: context.displayName,
      contactEmail: context.contactEmail,
      yearGroup: context.yearGroup,
      academicYear: context.academicYear,
      group: context.groupCode || "",
      groupCode: context.groupCode || "",
      groupName: context.groupName || "",
      enrolments: Array.isArray(context.enrolments) ? context.enrolments.slice() : []
    });
  }

  function publish(context) {
    currentStudent = studentFrom(context);
    listeners.slice().forEach(function (listener) {
      listener(currentStudent);
    });
    return currentStudent;
  }

  learner.subscribe(function (state) {
    publish(state && state.status === "authenticated" ? state.context : null);
  });

  function signInWithPassword(email, password) {
    return auth.signIn(email, password).then(function () {
      return learner.refresh();
    }).then(function () {
      return publish(learner.getContext());
    });
  }

  function signOut() {
    return auth.signOut().then(function () {
      publish(null);
      return true;
    });
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return function () {};
    listeners.push(listener);
    listener(currentStudent);
    return function () {
      listeners = listeners.filter(function (candidate) {
        return candidate !== listener;
      });
    };
  }

  window.StudentContext = Object.freeze({
    getCurrentStudent: function () { return currentStudent; },
    getStudentId: function () { return currentStudent ? currentStudent.studentId : null; },
    isSignedIn: function () { return Boolean(currentStudent); },
    signInWithPassword: signInWithPassword,
    signOut: signOut,
    subscribe: subscribe,
    isSupabase: function () { return true; }
  });
})();
