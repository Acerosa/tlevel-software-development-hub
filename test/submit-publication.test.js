const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function loadSubmitEngine(browserWindow) {
  const context = vm.createContext({
    window: browserWindow,
    globalThis: browserWindow,
    console,
    Date,
    Math,
    Object,
    Array,
    String,
    Number,
    JSON,
    encodeURIComponent,
    Promise
  });
  vm.runInContext(read("content/engine/version.js"), context, { filename: "content/engine/version.js" });
  vm.runInContext(read("content/engine/publication.js"), context, { filename: "content/engine/publication.js" });
  vm.runInContext(read("content/engine/submit.js"), context, { filename: "content/engine/submit.js" });
  return browserWindow.LearningPlatformContent;
}

test("week submit uses Core publication state when the content-engine copy is unset", async function () {
  const submitted = [];
  const browserWindow = {
    LearningPlatformCore: {
      evidence: {
        singleChoice(questionId, value) {
          return { questionId, type: "single-choice", value };
        }
      },
      createPublishedCurriculumService() {
        return {
          submissionMessage() {
            return "The live course version could not be confirmed. You can still read the saved teaching copy. Saving progress is temporarily unavailable.";
          }
        };
      }
    },
    LearningPlatform: {
      platform: {
        auth: { isSignedIn() { return true; } },
        curriculum: {
          getState() {
            return { state: "PUBLISHED", allowsSubmission: true, message: "published" };
          },
          allowsSubmission() { return true; }
        },
        submission: {
          submit(payload) {
            submitted.push(payload);
            return Promise.resolve({ ok: true });
          }
        }
      }
    }
  };
  const engine = loadSubmitEngine(browserWindow);
  engine.normaliseBlockType = function (type) { return type; };
  engine.isInteractiveBlockType = function () { return true; };
  assert.equal(engine.getPublicationState(), null);

  const activity = {
    id: "week-1-lesson-1-ex-07",
    version: "0.1.0",
    blocks: [{ id: "q1", type: "single-choice", content: { questionId: "q1" } }]
  };
  const draft = {
    responses: { q1: "user" },
    startedAt: "2026-09-08T10:41:31.961Z",
    completedAt: "2026-09-08T10:49:38.151Z"
  };

  const result = await engine.submitActivityDraft(activity, draft, {
    publication: null,
    platform: browserWindow.LearningPlatform.platform
  });
  assert.equal(result.status, "submitted");
  assert.equal(submitted.length, 1);
  assert.equal(submitted[0].activityKey, "week-1-lesson-1-ex-07");
});
