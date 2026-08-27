(function (root) {
  "use strict";

  var ns = root.LearningPlatformContent = root.LearningPlatformContent || {};
  var currentState = null;
  // Live teaching copies are loaded through api.published_curriculum_package
  // by @learning-platform/core/curriculum-runtime. This file is a hub adapter.

  function core() {
    return root.LearningPlatformCore;
  }

  function requireCore() {
    var runtime = core();
    if (!runtime || typeof runtime.createPublishedCurriculumService !== "function") {
      throw new Error("LEARNING_PLATFORM_CORE_UNAVAILABLE");
    }
    return runtime;
  }

  function localContext(pkg, config) {
    var curriculum = pkg && pkg.curriculum;
    var indexVersion = (pkg && pkg.indexFile && pkg.indexFile.version) || (pkg && pkg.version);
    return {
      hubCode: (config && (config.hubId || config.hubCode)) || (pkg && pkg.hub && pkg.hub.id) || "",
      courseKey: (config && config.courseKey) || (curriculum && curriculum.metadata && curriculum.metadata.course) || "",
      packageVersion: (pkg && pkg.version) || indexVersion || (curriculum && curriculum.version) || "",
      schemaVersion: (pkg && pkg.schemaVersion) || (config && config.schemaVersion) || (curriculum && curriculum.schemaVersion) || "",
      contentPackageVersion: (config && config.contentPackageVersion) || "0.1.0"
    };
  }

  function compareSemver(left, right) {
    var a = String(left || "0.0.0").split(".").map(function (part) { return Number(part) || 0; });
    var b = String(right || "0.0.0").split(".").map(function (part) { return Number(part) || 0; });
    var i;
    for (i = 0; i < 3; i += 1) {
      if ((a[i] || 0) > (b[i] || 0)) return 1;
      if ((a[i] || 0) < (b[i] || 0)) return -1;
    }
    return 0;
  }

  function createService(options) {
    var runtime = requireCore();
    var appConfig = (options && options.appConfig) || {};
    return runtime.createPublishedCurriculumService({
      hubCode: appConfig.hubId || appConfig.hubCode || "",
      courseKey: appConfig.courseKey || "",
      fetch: (options && options.fetch) || root.fetch,
      supabase: (options && options.config) || {},
      session: options && options.session,
      storage: (options && options.storage) || (typeof root.localStorage !== "undefined" ? root.localStorage : null),
      validatePackage: options && options.validate,
      loadBundled: options && options.loadBundled
    });
  }

  ns.PUBLICATION_STATES = Object.freeze(["PUBLISHED", "FALLBACK", "NO_PUBLICATION", "INCOMPATIBLE", "ERROR"]);
  ns.SUPPORTED_PUBLICATION_CONTRACT = Object.freeze({
    schemaVersion: "0.1.0",
    contentPackageVersion: "0.1.0"
  });
  ns.CURRICULUM_CACHE_PREFIX = "lp.curriculum.cache.v1:";
  ns.localPublicationContext = localContext;
  ns.compareCurriculumVersion = compareSemver;

  ns.curriculumCacheKey = function (hubCode, courseKey, version) {
    return requireCore().curriculumCacheKey(hubCode, courseKey, version);
  };

  ns.writeCurriculumCache = function (storage, hubId, courseKey, row, pkg) {
    return requireCore().createCacheManager(storage).write(hubId, courseKey, row, pkg, "latest");
  };

  ns.readCurriculumCache = function (storage, hubId, courseKey, validate) {
    var parsed = requireCore().createCacheManager(storage).read(hubId, courseKey, "latest");
    if (!parsed) return null;
    if (typeof validate === "function") {
      var validation = validate(parsed.package);
      if (!validation || validation.valid === false) return null;
    }
    return parsed;
  };

  ns.hydratePublishedPackage = function (row) {
    return requireCore().createPublicationResolver({}).hydrate(row);
  };

  ns.resolvePublicationState = function (local, rows, lookupError) {
    return requireCore().resolvePublicationState(local, rows, lookupError);
  };

  ns.setPublicationState = function (state) {
    currentState = state || null;
    return currentState;
  };

  ns.getPublicationState = function () {
    return currentState;
  };

  ns.publicationAllowsSubmission = function (state) {
    var resolved = state || currentState;
    return Boolean(resolved && resolved.allowsSubmission);
  };

  ns.publicationSubmissionMessage = function (state) {
    var resolved = state || currentState;
    if (!resolved) return requireCore().createPublishedCurriculumService({}).submissionMessage();
    return resolved.message;
  };

  ns.fetchPublishedCurriculumPackage = function (options) {
    return createService(options).loadLatest().then(function (runtime) {
      if (!runtime || runtime.source !== "published") throw new Error("publication-lookup-empty");
      return {
        hub_code: runtime.publication.hub,
        course_key: runtime.publication.course,
        package_version: runtime.publication.version,
        schema_version: runtime.publication.schemaVersion,
        source_package_version: runtime.publication.sourcePackageVersion,
        published_at: runtime.publication.publishedAt,
        content_hash: runtime.publication.contentHash,
        package: runtime.package
      };
    });
  };

  ns.loadCurriculumRuntime = function (options) {
    return createService(options).loadLatest().then(function (runtime) {
      ns.setPublicationState(runtime.state);
      return runtime;
    });
  };

  ns.lookupPublicationState = function (options) {
    return ns.loadCurriculumRuntime(options).then(function (runtime) {
      return ns.setPublicationState(runtime.state);
    });
  };

  ns.renderPublicationStatus = function (state) {
    return requireCore().renderPublicationStatus(state);
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
