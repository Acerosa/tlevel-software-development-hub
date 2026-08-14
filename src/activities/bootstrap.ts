export async function bootFoundationActivity(activitySlug: string) {
  await import("../../js/core/learning-api.js");
  await import("../../js/activities/activity-marking.js");
  await import("../../js/activities/activity-state.js");
  if (activitySlug === "programming-diagnostic") {
    await import("../../js/activities/programming-language.js");
    await import("../../js/activities/programming-checker.js");
    await import("../../js/activities/programming-feedback.js");
    await import("../../js/activities/programming-editor.js");
    await import("../../js/data/foundations/programming-diagnostic.js");
  } else if (activitySlug === "requirements-classification") {
    await import("../../js/data/foundations/requirements-classification.js");
  } else if (activitySlug === "problem-decomposition") {
    await import("../../js/data/foundations/problem-decomposition.js");
  } else if (activitySlug === "data-design") {
    await import("../../js/data/foundations/data-design.js");
  } else if (activitySlug === "testing-methods") {
    await import("../../js/data/foundations/testing-methods.js");
  } else {
    return;
  }
  await import("../../js/activities/activity-engine.js");
  window.FoundationActivityEngine?.initialise();
}
