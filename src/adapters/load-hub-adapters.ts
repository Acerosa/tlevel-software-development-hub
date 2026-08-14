let loaded = false;

export async function loadHubAdapters() {
  if (loaded) return;
  loaded = true;
  await import("../../js/core/utils.js");
  await import("../../js/core/student-context.js");
  await import("../../js/core/supabase-learning-api.js");
  await import("../../js/core/supabase-analytics.js");
  await import("../../js/core/learning-api.js");
}
