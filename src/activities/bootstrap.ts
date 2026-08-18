import { foundationActivityFromPackage } from "../curriculum/apply-runtime";
import type { ContentPackage } from "../curriculum/from-package";

export async function bootFoundationActivity(activitySlug: string) {
  await import("../../js/core/learning-api.js");
  await import("../../js/activities/activity-marking.js");
  await import("../../js/activities/activity-state.js");
  const published = window.__lpPackage
    ? foundationActivityFromPackage(window.__lpPackage as ContentPackage, activitySlug)
    : null;
  if (published) {
    window.FoundationActivityData = published;
  }
  if (activitySlug === "programming-diagnostic") {
    await import("../../js/activities/programming-language.js");
    await import("../../js/activities/programming-checker.js");
    await import("../../js/activities/programming-feedback.js");
    await import("../../js/activities/programming-editor.js");
    if (!published) await import("../../js/data/foundations/programming-diagnostic.js");
  } else if (activitySlug === "requirements-classification") {
    if (!published) await import("../../js/data/foundations/requirements-classification.js");
  } else if (activitySlug === "problem-decomposition") {
    if (!published) await import("../../js/data/foundations/problem-decomposition.js");
  } else if (activitySlug === "data-design") {
    if (!published) await import("../../js/data/foundations/data-design.js");
  } else if (activitySlug === "testing-methods") {
    if (!published) await import("../../js/data/foundations/testing-methods.js");
  } else {
    return;
  }
  await import("../../js/activities/activity-engine.js");
  window.FoundationActivityEngine?.initialise();
}
