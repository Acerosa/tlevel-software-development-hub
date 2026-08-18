import { afterEach, describe, expect, it } from "vitest";
import { activityFromPackage } from "./from-package";
import { applyTLevelCurriculum } from "./apply-runtime";
import pkg from "../../content/tlevel-software-development/package.json";

afterEach(() => {
  delete window.__lpPackage;
  delete window.__lpPublishedCurriculum;
  delete window.FoundationActivityCatalog;
  document.body.removeAttribute("data-curriculum-source");
});

describe("T Level package hydration", () => {
  it("restores Requirements Classification questions from published blocks", () => {
    const restored = activityFromPackage(pkg, "foundations-requirements-classification");
    expect(restored?.title).toBe("Requirements Classification");
    const sections = restored?.sections as Array<{ questions?: Array<{ id: string }> }> | undefined;
    expect(sections?.[0]?.questions?.[0]?.id).toBe("FOUND-REQ-001");
  });

  it("applies a mutated published title without reading Foundations JS banks", () => {
    const edited = structuredClone(pkg);
    const activity = edited.activities.find((item) => item.id === "foundations-requirements-classification");
    if (!activity) throw new Error("missing activity");
    activity.metadata.title = "Admin edited requirements title";
    applyTLevelCurriculum({
      source: "published",
      package: edited,
      state: { state: "PUBLISHED" }
    }, window);
    expect(window.__lpPublishedCurriculum).toBe(true);
    expect(document.body.dataset.curriculumSource).toBe("published");
    expect(window.FoundationActivityCatalog?.[1]?.title).toBe("Admin edited requirements title");
  });
});
