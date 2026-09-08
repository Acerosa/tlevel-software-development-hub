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

  function newAttempt(activity, learnerKey, seed) {
    var attempt = {
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
    if (seed && seed.programmingLanguage) {
      attempt.programmingLanguage = seed.programmingLanguage;
    }
    return attempt;
  }

  function getRemoteStore(activity, extraLegacyKeys) {
    var platform = window.LearningPlatform && window.LearningPlatform.platform;
    var progress = platform && platform.progress;
    if (!progress || typeof progress.createStore !== "function") return null;
    if (!platform.auth || typeof platform.auth.isSignedIn !== "function" || !platform.auth.isSignedIn()) {
      return null;
    }
    try {
      return progress.createStore({
        activityKey: activity.id,
        activityVersion: activity.version,
        storage: window.localStorage,
        legacyKeys: extraLegacyKeys || []
      });
    } catch (error) {
      return null;
    }
  }

  function createStore(activity) {
    var learnerKey = currentLearnerKey();
    var key = storageKey(activity.id, learnerKey);
    var remote = getRemoteStore(activity, [
      key,
      storageKey(activity.id, encodeURIComponent("guest")),
      storageKey(activity.id, encodeURIComponent("authenticated"))
    ]);

    function load() {
      var stored = read(key);
      if (!stored || stored.activityId !== activity.id || stored.activityVersion !== activity.version) {
        return null;
      }
      return clone(stored);
    }

    function save(attempt, saveOptions) {
      var written = write(key, attempt);
      if (remote && typeof remote.save === "function") {
        var payload = clone(attempt);
        delete payload.result;
        try { remote.save(payload, saveOptions || {}); } catch (error) {}
      }
      return written;
    }

    function reset(seed) {
      remove(key);
      var attempt = newAttempt(activity, learnerKey, seed);
      save(attempt);
      return attempt;
    }

    function adopt(sourceAttempt) {
      var adopted = clone(sourceAttempt);
      if (!adopted || adopted.activityId !== activity.id || adopted.activityVersion !== activity.version) {
        return null;
      }
      adopted.learnerKey = learnerKey;
      save(adopted);
      return clone(adopted);
    }

    return Object.freeze({
      key: key,
      learnerKey: learnerKey,
      load: load,
      save: save,
      reset: reset,
      adopt: adopt,
      start: function () {
        var existing = load();
        if (existing) {
          return existing;
        }
        var attempt = newAttempt(activity, learnerKey);
        save(attempt);
        return attempt;
      },
      hydrate: function () {
        if (!remote || typeof remote.hydrate !== "function") {
          return Promise.resolve(load());
        }
        return remote.hydrate(load()).then(function (resolved) {
          if (!resolved || resolved.activityId !== activity.id) return load();
          if (activity.version && resolved.activityVersion && resolved.activityVersion !== activity.version) {
            return load();
          }
          write(key, resolved);
          return clone(resolved);
        }).catch(function () {
          return load();
        });
      },
      flush: function () {
        if (remote && typeof remote.flush === "function") return remote.flush();
        return Promise.resolve(null);
      },
      clearRemote: function () {
        if (remote && typeof remote.clear === "function") return remote.clear({ local: false });
        return Promise.resolve();
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
