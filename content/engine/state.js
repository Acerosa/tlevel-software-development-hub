(function (root) {
  "use strict";

  var ns = root.LearningPlatformContent = root.LearningPlatformContent || {};
  var STORAGE_PREFIX = "learning-platform.content.draft.v1";

  function memoryStorage() {
    var data = {};
    var keys = [];
    function refreshKeys() {
      keys = Object.keys(data);
    }
    return {
      getItem: function (key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
      setItem: function (key, value) {
        data[key] = String(value);
        refreshKeys();
      },
      removeItem: function (key) {
        delete data[key];
        refreshKeys();
      },
      key: function (index) { return keys[index] || null; },
      get length() { return keys.length; }
    };
  }

  function safeStorage(preferred) {
    if (preferred) return preferred;
    try {
      if (root.localStorage) return root.localStorage;
    } catch (error) {
      return memoryStorage();
    }
    return memoryStorage();
  }

  function learnerKey(options) {
    var platform;
    var session;
    if (options && options.learnerKey) return String(options.learnerKey);
    platform = root.LearningPlatform && root.LearningPlatform.platform;
    session = platform && platform.auth && typeof platform.auth.getSession === "function"
      ? platform.auth.getSession()
      : null;
    if (session && session.user && session.user.id) return "auth:" + session.user.id;
    if (platform && platform.auth && typeof platform.auth.isSignedIn === "function" && platform.auth.isSignedIn()) {
      return "authenticated";
    }
    return "guest";
  }

  function storageKey(activityId, options) {
    return STORAGE_PREFIX + ":" + encodeURIComponent(learnerKey(options)) + ":" + encodeURIComponent(activityId);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function emptyDraft(activity) {
    return {
      activityId: activity.id,
      activityVersion: activity.version || "0.1.0",
      startedAt: new Date().toISOString(),
      completedAt: null,
      responses: {},
      checked: {},
      completed: false,
      submission: { status: "local" }
    };
  }

  ns.DRAFT_STORAGE_PREFIX = STORAGE_PREFIX;
  ns.createMemoryStorage = memoryStorage;

  ns.createDraftStore = function (activity, options) {
    var storage = safeStorage(options && options.storage);

    function currentKey() {
      return storageKey(activity.id, options);
    }

    function read() {
      try {
        var raw = storage.getItem(currentKey());
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        return null;
      }
    }

    function write(draft) {
      try {
        storage.setItem(currentKey(), JSON.stringify(draft));
        return true;
      } catch (error) {
        return false;
      }
    }

    function load() {
      var stored = read();
      if (!stored || stored.activityId !== activity.id) return emptyDraft(activity);
      if (stored.activityVersion !== (activity.version || "0.1.0")) return emptyDraft(activity);
      return stored;
    }

    function save(draft) {
      write(draft);
      return draft;
    }

    function reset() {
      try { storage.removeItem(currentKey()); } catch (error) {}
      var draft = emptyDraft(activity);
      write(draft);
      return draft;
    }

    return {
      get key() { return currentKey(); },
      load: load,
      save: save,
      reset: reset
    };
  };

  function listStorageKeys(storage) {
    var keys = [];
    var index;
    var key;
    if (!storage) return keys;
    if (typeof storage.length === "number" && typeof storage.key === "function") {
      for (index = 0; index < storage.length; index += 1) {
        key = storage.key(index);
        if (key) keys.push(key);
      }
      return keys;
    }
    if (typeof storage.keys === "function") {
      try { return storage.keys(); } catch (error) { return keys; }
    }
    return keys;
  }

  function draftHasWork(draft) {
    if (!draft || typeof draft !== "object") return false;
    if (draft.submission && draft.submission.status === "submitted") return true;
    return Boolean(draft.responses && Object.keys(draft.responses).length);
  }

  ns.migrateGuestDrafts = function (options) {
    var storage = safeStorage(options && options.storage);
    var destLearner = learnerKey(options);
    var guestToken = encodeURIComponent("guest");
    var destToken;
    var guestNeedle;
    var destPrefix;
    var migrated = 0;
    var skipped = 0;
    if (!destLearner || destLearner === "guest") {
      return { migrated: 0, skipped: 0, reason: "not-authenticated" };
    }
    destToken = encodeURIComponent(destLearner);
    guestNeedle = STORAGE_PREFIX + ":" + guestToken + ":";
    destPrefix = STORAGE_PREFIX + ":" + destToken + ":";
    listStorageKeys(storage).forEach(function (guestKey) {
      var activityPart;
      var destKey;
      var guestRaw;
      var destRaw;
      var destDraft;
      if (!guestKey || guestKey.indexOf(guestNeedle) !== 0) return;
      activityPart = guestKey.slice(guestNeedle.length);
      if (!activityPart) return;
      destKey = destPrefix + activityPart;
      try { guestRaw = storage.getItem(guestKey); } catch (error) { return; }
      if (!guestRaw) return;
      try { destRaw = storage.getItem(destKey); } catch (error) { destRaw = null; }
      try { destDraft = destRaw ? JSON.parse(destRaw) : null; } catch (error) { destDraft = null; }
      if (draftHasWork(destDraft)) {
        skipped += 1;
        return;
      }
      try {
        storage.setItem(destKey, guestRaw);
        storage.removeItem(guestKey);
        migrated += 1;
      } catch (error) {
        skipped += 1;
      }
    });
    return { migrated: migrated, skipped: skipped, reason: "ok" };
  };

  ns.summariseDraft = function (activity, options) {
    var store = ns.createDraftStore(activity, options);
    var draft = store.load();
    if (draft.completed) return { status: "practised", label: "Practised" };
    if (draft.responses && Object.keys(draft.responses).length) return { status: "started", label: "Started" };
    return { status: "not-started", label: "Not started" };
  };

  ns.cloneDraft = clone;
})(typeof globalThis !== "undefined" ? globalThis : this);
