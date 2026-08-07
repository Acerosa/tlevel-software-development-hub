(function () {
  "use strict";

  var storagePrefix = "tlevel.softwareDevelopment.foundations.v1";

  function currentLearnerKey() {
    var studentId = window.StudentContext && window.StudentContext.getStudentId
      ? window.StudentContext.getStudentId()
      : null;
    return encodeURIComponent(studentId || "guest");
  }

  function storageKey(activityId, learnerKey) {
    return storagePrefix + ":" + (learnerKey || currentLearnerKey()) + ":" + activityId;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function read(key) {
    try {
      var value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function remove(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function createAttemptId(activityId) {
    var uniquePart = window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    return activityId + "-" + uniquePart;
  }

  function newAttempt(activity, learnerKey) {
    return {
      activityId: activity.id,
      activityVersion: activity.version,
      attemptId: createAttemptId(activity.id),
      startedAt: new Date().toISOString(),
      currentSectionId: activity.sections[0].id,
      responses: {},
      submittedSections: [],
      result: null,
      learnerKey: learnerKey
    };
  }

  function createStore(activity) {
    var learnerKey = currentLearnerKey();
    var key = storageKey(activity.id, learnerKey);

    function load() {
      var stored = read(key);
      if (!stored || stored.activityId !== activity.id || stored.activityVersion !== activity.version) {
        return null;
      }
      return clone(stored);
    }

    function save(attempt) {
      return write(key, attempt);
    }

    function reset() {
      remove(key);
      var attempt = newAttempt(activity, learnerKey);
      save(attempt);
      return attempt;
    }

    return Object.freeze({
      key: key,
      learnerKey: learnerKey,
      load: load,
      save: save,
      reset: reset,
      start: function () {
        var existing = load();
        if (existing) {
          return existing;
        }
        var attempt = newAttempt(activity, learnerKey);
        save(attempt);
        return attempt;
      }
    });
  }

  function getSummary(activityId, version) {
    var stored = read(storageKey(activityId));
    if (!stored || version && stored.activityVersion !== version) {
      return { status: "not-started", label: "Not started", action: "Start activity" };
    }

    if (stored.result && typeof stored.result.percentage === "number") {
      return {
        status: "completed",
        label: "Completed, " + stored.result.percentage + "%",
        action: "Revisit activity",
        percentage: stored.result.percentage
      };
    }

    return { status: "in-progress", label: "In progress", action: "Continue activity" };
  }

  window.FoundationActivityState = Object.freeze({
    storagePrefix: storagePrefix,
    createStore: createStore,
    createAttemptId: createAttemptId,
    getSummary: getSummary
  });
})();
