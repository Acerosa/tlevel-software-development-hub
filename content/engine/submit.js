(function (root) {
  "use strict";

  var ns = root.LearningPlatformContent = root.LearningPlatformContent || {};

  function evidenceFor(block, response) {
    var core = root.LearningPlatformCore;
    var content = (block && block.content) || {};
    var questionId = content.questionId || block.id;
    var type = ns.normaliseBlockType(block.type);
    if (!core || !core.evidence) return null;
    try {
      if (type === "single-choice" && response) return core.evidence.singleChoice(questionId, String(response));
      if (type === "short-response") {
        if (response == null || !String(response).trim()) return null;
        return core.evidence.written(questionId, String(response));
      }
      if (type === "reflection") {
        if (response == null || !String(response).trim()) return null;
        return core.evidence.reflection(questionId, String(response));
      }
      if ((type === "code-editor" || type === "python-exercise") && response != null) {
        return core.evidence.coding(questionId, String(response), { language: "python" });
      }
      if (type === "classification" && response && typeof response === "object") {
        return Object.keys(response).map(function (itemId) {
          return core.evidence.classification(questionId + ":" + itemId, String(response[itemId]), itemId);
        });
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  function flattenEvidence(blocks, responses) {
    var list = [];
    (blocks || []).forEach(function (block) {
      var questionId = (block.content && block.content.questionId) || block.id;
      var built = evidenceFor(block, responses[questionId]);
      if (!built) return;
      if (Array.isArray(built)) list = list.concat(built);
      else list.push(built);
    });
    return list;
  }

  ns.buildActivityEvidence = function (activity, draft) {
    return flattenEvidence(activity.blocks || [], (draft && draft.responses) || {});
  };

  ns.activityRequiresPython = function (activity) {
    return (activity.blocks || []).some(function (block) {
      var type = ns.normaliseBlockType(block.type);
      return type === "code-editor" || type === "python-exercise";
    });
  };

  ns.expectedEvidenceCount = function (activity) {
    var count = 0;
    (activity.blocks || []).forEach(function (block) {
      var type = ns.normaliseBlockType(block.type);
      if (typeof ns.isInteractiveBlockType === "function" && !ns.isInteractiveBlockType(type)) return;
      if (type === "classification") {
        var items = (block.content && block.content.items) || [];
        count += items.length || 1;
      } else if (
        type === "single-choice" ||
        type === "short-response" ||
        type === "reflection" ||
        type === "code-editor" ||
        type === "python-exercise"
      ) {
        count += 1;
      }
    });
    return count;
  };

  ns.activityEvidenceComplete = function (activity, draft) {
    var expected = ns.expectedEvidenceCount(activity);
    return expected > 0 && ns.buildActivityEvidence(activity, draft).length === expected;
  };

  ns.serialiseActivityResult = function (activity, draft) {
    var responses = (draft && draft.responses) || {};
    return {
      activityId: activity.id,
      version: ns.resolvedActivityVersion(activity),
      responses: Object.keys(responses).map(function (questionId) {
        var block = (activity.blocks || []).filter(function (item) {
          return ((item.content && item.content.questionId) || item.id) === questionId;
        })[0];
        return {
          questionId: questionId,
          type: block ? ns.normaliseBlockType(block.type) : "unknown",
          value: responses[questionId]
        };
      })
    };
  };

  var inflightSubmissions = {};

  function responseFingerprint(activity, draft) {
    return JSON.stringify({
      activityId: activity && activity.id,
      activityVersion: ns.resolvedActivityVersion(activity),
      responses: (draft && draft.responses) || {}
    });
  }

  var LOCAL_KEEP_DRAFT = "Your work is still saved on this device. It has not been sent to your learning record yet. You can continue the lesson and try again later.";

  ns.submitActivityDraft = function (activity, draft, options) {
    var platform = (options && options.platform) || (root.LearningPlatform && root.LearningPlatform.platform);
    var responses = ns.buildActivityEvidence(activity, draft);
    var activityId = activity && activity.id;
    var fingerprint = responseFingerprint(activity, draft);
    var result = {
      status: "local",
      failed: false,
      reason: "Your work is saved on this device. Sign in to store it against your learner record when this activity is published."
    };

    if (!responses.length) {
      result.reason = "Add a response before saving to your learning record.";
      return Promise.resolve(result);
    }
    if (!ns.activityEvidenceComplete(activity, draft)) {
      result.reason = "Complete every question in this activity before saving to your learning record.";
      return Promise.resolve(result);
    }
    if (!platform || !platform.auth || !platform.auth.isSignedIn()) {
      return Promise.resolve(result);
    }
    if (!ns.publicationAllowsSubmission(options && options.publication)) {
      result.reason = ns.publicationSubmissionMessage(options && options.publication);
      return Promise.resolve(result);
    }
    if (!platform.submission || typeof platform.submission.submit !== "function") {
      result.failed = true;
      result.reason = LOCAL_KEEP_DRAFT;
      return Promise.resolve(result);
    }
    if (!ns.resolvedActivityVersion(activity)) {
      result.failed = true;
      result.reason = "This activity cannot be saved because it has no published version.";
      return Promise.resolve(result);
    }
    if (
      draft
      && draft.submission
      && draft.submission.status === "submitted"
      && draft.submission.fingerprint === fingerprint
    ) {
      return Promise.resolve({
        status: "submitted",
        failed: false,
        reason: draft.submission.reason || "Saved to your learning record."
      });
    }
    if (inflightSubmissions[activityId]) return inflightSubmissions[activityId];

    try {
      var payload = {
        activityKey: activity.id,
        activityVersion: ns.resolvedActivityVersion(activity),
        responses: responses,
        sourcePage: options && options.sourcePage,
        startedAt: draft.startedAt,
        completedAt: draft.completedAt || new Date().toISOString()
      };
      if (ns.activityRequiresPython(activity)) payload.programmingLanguage = "python";
      inflightSubmissions[activityId] = platform.submission.submit(payload).then(function () {
        return {
          status: "submitted",
          failed: false,
          fingerprint: fingerprint,
          reason: "Saved to your learning record."
        };
      }).catch(function (error) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("L2E_SUBMISSION_FAILED", error && (error.code || error.message) || error);
        }
        return {
          status: "local",
          failed: true,
          reason: LOCAL_KEEP_DRAFT
        };
      }).then(function (outcome) {
        delete inflightSubmissions[activityId];
        return outcome;
      }, function (error) {
        delete inflightSubmissions[activityId];
        throw error;
      });
      return inflightSubmissions[activityId];
    } catch (error) {
      delete inflightSubmissions[activityId];
      if (typeof console !== "undefined" && console.warn) {
        console.warn("L2E_SUBMISSION_FAILED", error);
      }
      return Promise.resolve({
        status: "local",
        failed: true,
        reason: LOCAL_KEEP_DRAFT
      });
    }
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
