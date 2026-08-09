(function () {
  "use strict";

  var config = window.SUPABASE_CONFIG || {};
  var auth = window.SupabaseAuth;
  var sessionService = window.StudentSession;
  var legacyStudent = sessionService && sessionService.getStudentSession
    ? sessionService.getStudentSession()
    : null;
  var currentStudent = legacyStudent ? Object.freeze(legacyStudent) : null;
  var listeners = [];
  var usingSupabase = config.backend === "supabase" && Boolean(auth);

  function notify() {
    listeners.slice().forEach(function (listener) {
      listener(currentStudent);
    });
  }

  function contextFromAuth(context) {
    if (!context) {
      return null;
    }
    return Object.freeze({
      studentId: context.studentNumber,
      studentNumber: context.studentNumber,
      firstName: context.firstName,
      displayName: context.displayName,
      group: context.groupCode || context.group || "",
      groupCode: context.groupCode || context.group || "",
      groupName: context.groupName || "",
      enrolments: Array.isArray(context.enrolments) ? context.enrolments.slice() : []
    });
  }

  function setCurrent(student) {
    currentStudent = student ? Object.freeze(student) : null;
    notify();
    return currentStudent;
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
    if (usingSupabase) {
      throw new Error("SUPABASE_AUTH_REQUIRED");
    }
    var session = sessionService.saveStudentSession(student);
    if (!session) {
      var error = new Error("Student session could not be saved.");
      error.code = "SESSION_STORAGE_ERROR";
      throw error;
    }
    return setCurrent(session);
  }

  function signInWithPassword(email, password) {
    if (!usingSupabase) {
      return Promise.reject(new Error("SUPABASE_AUTH_UNAVAILABLE"));
    }
    return auth.signInWithPassword(email, password).then(function () {
      return setCurrent(contextFromAuth(auth.getLearnerContext()));
    });
  }

  function signOut() {
    if (usingSupabase) {
      return auth.signOut().then(function () {
        setCurrent(null);
        return true;
      });
    }
    if (sessionService) {
      sessionService.clearStudentSession();
    }
    setCurrent(null);
    return Promise.resolve(true);
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

  if (usingSupabase) {
    auth.subscribe(function (state) {
      setCurrent(contextFromAuth(state.profile ? auth.getLearnerContext() : null));
    });
  }

  window.StudentContext = Object.freeze({
    getCurrentStudent: getCurrentStudent,
    getStudentId: getStudentId,
    isSignedIn: isSignedIn,
    signIn: signIn,
    signInWithPassword: signInWithPassword,
    signOut: signOut,
    subscribe: subscribe,
    isSupabase: function () { return usingSupabase; }
  });
})();
