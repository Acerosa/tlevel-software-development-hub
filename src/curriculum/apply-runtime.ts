import { activityFromPackage, catalogFromPackage, type ContentPackage } from "./from-package";

export type CurriculumRuntime = {
  source?: string;
  package?: ContentPackage | null;
  state?: { state?: string; message?: string } | null;
  publication?: { version?: string; hub?: string; course?: string } | null;
};

function bannerHost(doc: Document) {
  let host = doc.getElementById("lp-publication-status");
  if (!host) {
    host = doc.createElement("div");
    host.id = "lp-publication-status";
    doc.body.prepend(host);
  }
  return host;
}

export function applyTLevelCurriculum(
  runtime: CurriculumRuntime,
  target: Window & typeof globalThis = window,
  renderStatus?: (state: unknown) => string
) {
  const pkg = runtime.package || null;
  const source = runtime.source || "none";
  target.__lpPackage = pkg || undefined;
  target.__lpPublishedCurriculum = Boolean(pkg);
  if (target.document?.body) {
    target.document.body.dataset.curriculumSource = source;
    target.document.body.dataset.publicationState = runtime.state?.state || "ERROR";
  }
  if (runtime.state && target.document && typeof renderStatus === "function") {
    bannerHost(target.document).innerHTML = renderStatus(runtime.state);
  }
  if (source !== "published") {
    console.warn("TLEVEL_CURRICULUM_FALLBACK", source, runtime.state?.state || "ERROR");
  }
  if (!pkg) return runtime;
  target.FoundationActivityCatalog = catalogFromPackage(pkg);
  return runtime;
}

export function foundationActivityFromPackage(pkg: ContentPackage | null | undefined, activitySlug: string) {
  if (!pkg) return null;
  const activityId = activitySlug.startsWith("foundations-")
    ? activitySlug
    : `foundations-${activitySlug}`;
  return activityFromPackage(pkg, activityId);
}

export async function loadTLevelCurriculum(platform: {
  curriculum: {
    loadLatest: () => Promise<unknown>;
    renderStatus?: (state: unknown) => string;
  };
}) {
  const runtime = await platform.curriculum.loadLatest() as CurriculumRuntime;
  return applyTLevelCurriculum(runtime, window, (state) => platform.curriculum.renderStatus?.(state) || "");
}
