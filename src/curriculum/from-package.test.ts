import { afterEach, describe, expect, it } from "vitest";
import { activityFromPackage, catalogFromPackage, homeWeeksFromPackage, isWeekAvailable, overlayLiveWeekMetadata, weekPageFromPackage } from "./from-package";
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
    const retrieval = pkg.activities.find((item) => item.id === "week-1-lesson-1-retrieval");
    expect((retrieval?.blocks || []).some((block) => block.type === "single-choice")).toBe(true);
  });

  it("exposes Weeks 1 to 22 for the learner home and week pages", () => {
    const weeks = homeWeeksFromPackage(pkg);
    expect(weeks).toHaveLength(22);
    expect(weeks.map((item) => item.label)).toEqual(
      Array.from({ length: 22 }, (_, index) => `Week ${index + 1}`)
    );
    expect(weeks[0].path).toBe("week-1/");
    expect(weeks[0].openable).toBe(true);
    expect(weeks[0].status).toBe("available");
    expect(weeks[0].current).toBe(true);
    expect(weeks[1].openable).toBe(false);
    expect(weeks[1].status).toBe("planned");
    expect(weeks[1].weekCommencing).toBe("2026-09-07");
    expect(weeks[21].openable).toBe(false);
    expect(weeks[21].status).toBe("planned");
    expect(weeks.filter((week) => week.openable)).toHaveLength(1);
    expect(isWeekAvailable("available")).toBe(true);
    expect(isWeekAvailable("planned")).toBe(false);
    expect(isWeekAvailable("archived")).toBe(false);
    const week1 = weekPageFromPackage(pkg, "week-1");
    expect(week1?.week.title).toBe("Client Brief, Context and Initial Research");
    expect(week1?.sessions.map((item) => item.id)).toEqual([
      "week-1-lesson-1",
      "week-1-lesson-2",
      "week-1-lesson-3",
      "week-1-homework"
    ]);
    expect(week1?.sessions[0].activities[0].id).toBe("week-1-lesson-1-retrieval");
    expect(week1?.week.status).toBe("available");
    expect(weekPageFromPackage(pkg, "week-2")?.week.status).toBe("planned");
    const week2Page = weekPageFromPackage(pkg, "week-2");
    expect(week2Page?.sessions.every((session) => session.accessible === false)).toBe(true);
    expect(week2Page?.sessions.flatMap((session) => session.activities)).toEqual([]);
  });

  it("shows only available sessions inside an available week", () => {
    const edited = structuredClone(pkg);
    const lesson2 = edited.sessions.find((item) => item.id === "week-1-lesson-2");
    const lesson3 = edited.sessions.find((item) => item.id === "week-1-lesson-3");
    const homework = edited.sessions.find((item) => item.id === "week-1-homework");
    if (!lesson2?.metadata || !lesson3?.metadata || !homework?.metadata) throw new Error("missing week-1 sessions");
    lesson2.metadata.status = "planned";
    lesson3.metadata.status = "planned";
    homework.metadata.status = "planned";
    const page = weekPageFromPackage(edited, "week-1");
    expect(page?.sessions.map((session) => ({ id: session.id, accessible: session.accessible }))).toEqual([
      { id: "week-1-lesson-1", accessible: true },
      { id: "week-1-lesson-2", accessible: false },
      { id: "week-1-lesson-3", accessible: false },
      { id: "week-1-homework", accessible: false }
    ]);
    expect(page?.sessions[0].activities.length).toBeGreaterThan(0);
    expect(page?.sessions[1].activities).toEqual([]);
    expect(page?.sessions[1].summary).toBe("Not released yet");
  });

  it("overlays live session status without replacing session structure", () => {
    const live = overlayLiveWeekMetadata(pkg, {
      weeks: [{ id: "week-1", metadata: { teachingWeek: 1, status: "available" } }],
      sessions: [{ id: "week-1-lesson-2", metadata: { status: "planned", title: "Must not replace" } }]
    });
    const page = weekPageFromPackage(live, "week-1");
    expect(page?.sessions[1].accessible).toBe(false);
    expect(page?.sessions[1].title).toBe("Lesson 2: Market, problems and risks");
    expect(live.sessions?.find((item) => item.id === "week-1-lesson-2")?.relationships?.activities?.length).toBeGreaterThan(0);
  });

  it("overlays live week status by id, then by teachingWeek", () => {
    const byId = overlayLiveWeekMetadata(pkg, {
      weeks: [{ id: "week-2", metadata: { teachingWeek: 2, status: "available" } }]
    });
    expect(homeWeeksFromPackage(byId)[1].openable).toBe(true);
    expect(homeWeeksFromPackage(byId)[1].status).toBe("available");

    const byTeachingWeek = overlayLiveWeekMetadata(pkg, {
      weeks: [{ id: "posted-week-two", metadata: { teachingWeek: 2, status: "available" } }]
    });
    expect(homeWeeksFromPackage(byTeachingWeek)[1].id).toBe("week-2");
    expect(homeWeeksFromPackage(byTeachingWeek)[1].openable).toBe(true);

    const idWins = overlayLiveWeekMetadata(pkg, {
      weeks: [
        { id: "week-2", metadata: { teachingWeek: 2, status: "archived" } },
        { id: "other-week-2", metadata: { teachingWeek: 2, status: "available" } }
      ]
    });
    expect(homeWeeksFromPackage(idWins)[1].status).toBe("archived");
    expect(homeWeeksFromPackage(idWins)[1].openable).toBe(false);

    const bundledAvailable = structuredClone(pkg);
    const weekTwo = bundledAvailable.weeks.find((week) => week.id === "week-2");
    if (!weekTwo?.metadata) throw new Error("missing week-2");
    weekTwo.metadata.status = "available";
    const livePlanned = overlayLiveWeekMetadata(bundledAvailable, {
      weeks: [{ id: "week-2", metadata: { teachingWeek: 2, status: "planned" } }]
    });
    expect(homeWeeksFromPackage(livePlanned)[1].openable).toBe(false);
    expect(homeWeeksFromPackage(livePlanned)[1].status).toBe("planned");
  });
});
