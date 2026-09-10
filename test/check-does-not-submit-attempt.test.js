const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function memoryStorage() {
  const data = {};
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
    removeItem(key) { delete data[key]; }
  };
}

function oneQuestionActivity() {
  return {
    id: "week-1-lesson-1-ex-01",
    version: "0.1.0",
    blocks: [{
      id: "week-1-lesson-1-ex-01-client",
      type: "single-choice",
      content: {
        questionId: "week-1-lesson-1-ex-01:client",
        prompt: "Who is the client?",
        options: [
          { id: "a", label: "Adult learners who book a course" },
          { id: "c", label: "Tutors who take a register" }
        ]
      }
    }]
  };
}

function twoQuestionActivity() {
  const first = oneQuestionActivity().blocks[0];
  return {
    id: "week-multi",
    version: "0.1.0",
    blocks: [
      first,
      {
        id: "q2-block",
        type: "single-choice",
        content: {
          questionId: "q2",
          prompt: "Second question",
          options: [
            { id: "b", label: "B" },
            { id: "d", label: "D" }
          ]
        }
      }
    ]
  };
}

function articleHtml(activity) {
  const blocks = activity.blocks.map((block) => {
    const qid = block.content.questionId;
    const options = block.content.options.map((option) => (
      `<label><input type="radio" name="${block.id}" data-lp-response value="${option.id}">${option.label}</label>`
    )).join("");
    return `<div data-lp-block-id="${block.id}" data-lp-question="${qid}" data-lp-block="single-choice">
      <fieldset>${options}</fieldset>
      <button type="button" data-lp-check="${block.id}">Check answer</button>
      <p data-lp-feedback></p>
    </div>`;
  }).join("");
  return `<article data-lp-activity="${activity.id}">
    ${blocks}
    <div class="lp-activity-actions">
      <button type="button" data-lp-reset-activity="${activity.id}">Reset activity</button>
      <p data-lp-activity-status role="status"></p>
    </div>
  </article>`;
}

function loadBoundEngine({ submits, saves }) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/" });
  const browserWindow = dom.window;
  browserWindow.localStorage = memoryStorage();
  browserWindow.LearningPlatform = {
    platform: {
      auth: {
        isSignedIn() { return true; },
        getSession() { return { user: { id: "auth-user" } }; }
      },
      progress: {
        createStore() {
          return {
            save(draft, options) { saves.push({ draft: JSON.parse(JSON.stringify(draft)), options: options || {} }); },
            hydrate(local) { return Promise.resolve(local); },
            flush() { return Promise.resolve(null); },
            clear() { return Promise.resolve(); }
          };
        }
      }
    }
  };
  const context = vm.createContext(browserWindow);
  browserWindow.globalThis = browserWindow;
  vm.runInContext(read("content/engine/version.js"), context, { filename: "content/engine/version.js" });
  vm.runInContext(read("content/engine/state.js"), context, { filename: "content/engine/state.js" });
  vm.runInContext(read("content/engine/interactive.js"), context, { filename: "content/engine/interactive.js" });
  const engine = browserWindow.LearningPlatformContent;
  engine.normaliseBlockType = function (type) { return type; };
  engine.isInteractiveBlockType = function () { return true; };
  engine.markBlock = function () { return { complete: true, feedback: "Checked." }; };
  engine.getPublicationState = function () { return { state: "PUBLISHED", allowsSubmission: true }; };
  engine.submitActivityDraft = function (activity, draft) {
    submits.push({
      activityId: activity.id,
      responses: JSON.parse(JSON.stringify(draft.responses || {})),
      checked: JSON.parse(JSON.stringify(draft.checked || {}))
    });
    return Promise.resolve({ status: "submitted", fingerprint: "fp", reason: "Saved to your learning record." });
  };
  return { engine, document: browserWindow.document, window: browserWindow };
}

function bind(activity, extra) {
  const submits = extra?.submits || [];
  const saves = extra?.saves || [];
  const { engine, document } = loadBoundEngine({ submits, saves });
  document.body.innerHTML = articleHtml(activity);
  engine.bindInteractive(document.body, { activities: [activity] }, { storage: memoryStorage() });
  return { engine, document, submits, saves, article: document.querySelector("[data-lp-activity]") };
}

test("HTML Check persists a one-question activity without submitting an attempt", function () {
  const activity = oneQuestionActivity();
  const { document, submits, saves, article } = bind(activity);
  const qid = "week-1-lesson-1-ex-01:client";
  document.querySelector('input[value="a"]').checked = true;
  document.querySelector("[data-lp-check]").click();
  const lastSave = saves.at(-1);
  assert.equal(lastSave.draft.responses[qid], "a");
  assert.equal(lastSave.draft.checked[qid], true);
  assert.equal(lastSave.options.immediate, true);
  assert.equal(submits.length, 0);
  const finish = article.querySelector("[data-lp-finish-activity]");
  assert.equal(finish.hidden, false);
});

test("retry Check replaces the stored response and still does not submit", function () {
  const activity = oneQuestionActivity();
  const { document, submits, saves } = bind(activity);
  const qid = "week-1-lesson-1-ex-01:client";
  document.querySelector('input[value="a"]').checked = true;
  document.querySelector("[data-lp-check]").click();
  document.querySelector('input[value="c"]').checked = true;
  document.querySelector('input[value="a"]').checked = false;
  document.querySelector("[data-lp-check]").click();
  const lastSave = saves.at(-1);
  assert.equal(lastSave.draft.responses[qid], "c");
  assert.equal(lastSave.draft.checked[qid], true);
  assert.deepEqual(Object.keys(lastSave.draft.responses), [qid]);
  assert.equal(submits.length, 0);
});

test("React lp-block-result Check does not submit; Finish activity submits once", async function () {
  const activity = oneQuestionActivity();
  const { document, submits, article } = bind(activity);
  const qid = "week-1-lesson-1-ex-01:client";
  article.dispatchEvent(new document.defaultView.CustomEvent("lp-block-result", {
    bubbles: true,
    detail: {
      questionId: qid,
      response: "a",
      completed: true,
      result: { correct: true, status: "correct", canRetry: false }
    }
  }));
  assert.equal(submits.length, 0);
  article.querySelector("[data-lp-finish-activity]").click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(submits.length, 1);
  assert.equal(submits[0].responses[qid], "a");
  article.querySelector("[data-lp-finish-activity]").click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(submits.length, 1);
});

test("React lp-block-result Check persists learner-safe results without answer keys", function () {
  const activity = oneQuestionActivity();
  const saves = [];
  const { article } = bind(activity, { saves });
  const qid = "week-1-lesson-1-ex-01:client";
  article.dispatchEvent(new article.ownerDocument.defaultView.CustomEvent("lp-block-result", {
    bubbles: true,
    detail: {
      questionId: qid,
      response: "a",
      completed: true,
      result: {
        correct: false,
        status: "incorrect",
        canRetry: true,
        correctOptionId: "c",
        score: { correct: 0, total: 1 }
      }
    }
  }));
  const lastSave = saves.at(-1);
  assert.equal(lastSave.draft.checked[qid], true);
  assert.deepEqual(lastSave.draft.results[qid], {
    correct: false,
    status: "incorrect",
    canRetry: true
  });
  assert.equal(Object.prototype.hasOwnProperty.call(lastSave.draft.results[qid], "correctOptionId"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(lastSave.draft.results[qid], "score"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(lastSave.draft, "result"), false);
});

test("cleared Check removes stored results for that question", function () {
  const activity = oneQuestionActivity();
  const saves = [];
  const { article } = bind(activity, { saves });
  const qid = "week-1-lesson-1-ex-01:client";
  article.dispatchEvent(new article.ownerDocument.defaultView.CustomEvent("lp-block-result", {
    bubbles: true,
    detail: {
      questionId: qid,
      response: "a",
      completed: true,
      result: { correct: true, status: "correct" }
    }
  }));
  article.dispatchEvent(new article.ownerDocument.defaultView.CustomEvent("lp-block-result", {
    bubbles: true,
    detail: { questionId: qid, response: "a", completed: false }
  }));
  const lastSave = saves.at(-1);
  assert.equal(lastSave.draft.checked[qid], false);
  assert.equal(lastSave.draft.results[qid], undefined);
});

test("checking the last question of a multi-question activity does not submit", function () {
  const activity = twoQuestionActivity();
  const { document, submits, article } = bind(activity);
  const firstCheck = document.querySelector('[data-lp-check="week-1-lesson-1-ex-01-client"]');
  const secondCheck = document.querySelector('[data-lp-check="q2-block"]');
  document.querySelector('input[value="a"]').checked = true;
  firstCheck.click();
  assert.equal(submits.length, 0);
  assert.equal(article.querySelector("[data-lp-finish-activity]").hidden, true);
  document.querySelector('input[value="b"]').checked = true;
  secondCheck.click();
  assert.equal(submits.length, 0);
  assert.equal(article.querySelector("[data-lp-finish-activity]").hidden, false);
});

test("week Check handlers only submit from Finish activity", function () {
  const source = read("content/engine/interactive.js");
  const checkHandler = source.slice(
    source.indexOf('if (checkId) {'),
    source.indexOf("if (finishId === activity.id)")
  );
  const reactHandler = source.slice(
    source.indexOf('article.addEventListener("lp-block-result"'),
    source.indexOf('article.addEventListener("change"')
  );
  assert.doesNotMatch(checkHandler, /submitActivityDraft/);
  assert.doesNotMatch(reactHandler, /submitActivityDraft/);
  assert.match(source, /function finishActivity\(\)/);
  assert.match(source, /data-lp-finish-activity/);
  assert.match(source, /finishActivity\(\)/);
});

test("WeekPage hydrates initialResults from draft store", function () {
  const weekPage = read("src/pages/WeekPage.tsx");
  assert.match(weekPage, /initialResults=\{draftByActivity\[activity\.id\]\?\.results\}/);
  assert.match(weekPage, /initialChecked=\{draftByActivity\[activity\.id\]\?\.checked\}/);
  assert.match(weekPage, /results:\s*draft\?\.results/);
  assert.match(weekPage, /correct:\s*result\.correct\s*\?\?\s*null/);
  assert.match(weekPage, /canRetry:\s*result\.canRetry/);
  assert.match(weekPage, /status:\s*result\.status/);
  assert.match(weekPage, /requiresReview:\s*result\.requiresReview/);
});
