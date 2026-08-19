import { afterEach, describe, expect, it } from "vitest";
import { activityFromPackage, catalogFromPackage, homeWeeksFromPackage, weekPageFromPackage } from "./from-package";
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

  it("keeps the Foundations catalogue limited to foundations activities", () => {
    const catalog = catalogFromPackage(pkg);
    expect(catalog.every((item) => item.id.startsWith("foundations-"))).toBe(true);
    expect(catalog).toHaveLength(5);
    expect(pkg.activities.some((item) => item.id === "week-1-lesson-1-main")).toBe(true);
  });

  it("exposes Weeks 1 to 3 for the learner home and week pages", () => {
    const weeks = homeWeeksFromPackage(pkg);
    expect(weeks.map((item) => item.label)).toEqual(["Week 1", "Week 2", "Week 3"]);
    expect(weeks[0].path).toBe("week-1/");
    expect(weeks[0].current).toBe(true);
    const week1 = weekPageFromPackage(pkg, "week-1");
    expect(week1?.week.title).toBe("Introduction to New and Emerging Digital Technologies");
    expect(week1?.sessions.map((item) => item.id)).toEqual([
      "week-1-lesson-1",
      "week-1-lesson-2",
      "week-1-lesson-3",
      "week-1-homework"
    ]);
    expect(week1?.sessions[0].activities[0].title).toMatch(/Baseline diagnostic/i);
  });
});
