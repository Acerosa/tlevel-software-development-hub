import { foundationActivityFromPackage } from "../curriculum/apply-runtime";
import type { ContentPackage } from "../curriculum/from-package";
import { foundationsActivityHasMarkingKeys } from "./foundations-marking-keys";

/**
 * Learner packages strip answer keys. Foundations activities still mark locally
 * from FoundationActivityData, so hydrate from the published package only when
 * marking keys survived; otherwise use the authoritative local banks.
 */
export async function bootFoundationActivity(activitySlug: string) {
  await import("../../js/core/learning-api.js");
  await import("../../js/activities/activity-marking.js");
  await import("../../js/activities/activity-state.js");
  const published = window.__lpPackage
    ? foundationActivityFromPackage(window.__lpPackage as ContentPackage, activitySlug)
    : null;
  const usePublished = foundationsActivityHasMarkingKeys(published);
  if (usePublished && published) {
    window.FoundationActivityData = published;
  } else {
    delete window.FoundationActivityData;
  }
  if (activitySlug === "programming-diagnostic") {
    await import("../../js/activities/programming-language.js");
    await import("../../js/activities/programming-checker.js");
    await import("../../js/activities/programming-feedback.js");
    await import("../../js/activities/programming-editor.js");
    if (!usePublished) await import("../../js/data/foundations/programming-diagnostic.js");
  } else if (activitySlug === "requirements-classification") {
    if (!usePublished) await import("../../js/data/foundations/requirements-classification.js");
  } else if (activitySlug === "problem-decomposition") {
    if (!usePublished) await import("../../js/data/foundations/problem-decomposition.js");
  } else if (activitySlug === "data-design") {
    if (!usePublished) await import("../../js/data/foundations/data-design.js");
  } else if (activitySlug === "testing-methods") {
    if (!usePublished) await import("../../js/data/foundations/testing-methods.js");
  } else {
    return;
  }
  await import("../../js/activities/activity-engine.js");
  window.FoundationActivityEngine?.initialise();
}
