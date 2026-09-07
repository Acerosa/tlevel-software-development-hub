import { CompletionModal, InteractiveActivity, PracticeProgressPanel } from "@learning-platform/ui";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import pkg from "../content/tlevel-software-development/package.json";
import { CourseSidebar } from "./components/CourseSidebar";
import { type ContentPackage } from "./curriculum/from-package";
import { HomePage } from "./pages/HomePage";
import { accessibleWeekActivityTotal, persistableResponse, WeekPage } from "./pages/WeekPage";
import { breadcrumbs } from "./page-copy";

const content = pkg as ContentPackage;

function week1Lesson1ActivityId(type: string): string {
  const session = content.sessions?.find((item) => item.id === "week-1-lesson-1");
  const byId = new Map((content.activities || []).map((item) => [item.id, item]));
  const id = session?.relationships?.activities?.find((activityId) =>
    ((byId.get(activityId)?.blocks || []) as Array<{ type?: string }>).some((block) => block.type === type)
  );
  if (!id) throw new Error("missing Week 1 Lesson 1 activity for " + type);
  return id;
}

function week1ActivityItemCount(activityId: string): number {
  const activity = content.activities?.find((item) => item.id === activityId);
  const block = activity?.blocks?.[0] as { content?: { items?: unknown[] } } | undefined;
  return (block?.content?.items || []).length;
}

function plannedWeek1ActivityCount(): number {
  return (content.sessions || [])
    .filter((session) => session.id !== "week-1-lesson-1" && String(session.id).startsWith("week-1-"))
    .reduce((sum, session) => sum + (session.relationships?.activities || []).length, 0);
}

afterEach(() => {
  cleanup();
  delete window.__lpPackage;
  delete window.__lpPublishedCurriculum;
});

function withWeekStatus(source: ContentPackage, updates: Record<string, string>): ContentPackage {
  const clone = structuredClone(source);
  for (const week of clone.weeks || []) {
    if (updates[week.id] && week.metadata) week.metadata.status = updates[week.id];
  }
  return clone;
}

function learnerSafePackage(source: ContentPackage): ContentPackage {
  const clone = structuredClone(source);
  for (const activity of clone.activities || []) {
    for (const block of activity.blocks || []) {
      const body = block.content as Record<string, unknown> | undefined;
      if (!body) continue;
      delete body.correctOptionId;
      delete body.correct;
      if (Array.isArray(body.options)) {
        for (const option of body.options as Array<Record<string, unknown>>) {
          delete option.correct;
        }
      }
      if (Array.isArray(body.items)) {
        for (const item of body.items as Array<Record<string, unknown>>) {
          delete item.correct;
        }
      }
    }
  }
  return clone;
}

function liveWeekByTeachingWeek(teachingWeek: number, status: string): ContentPackage {
  return {
    weeks: [{
      id: `posted-week-${teachingWeek}`,
      metadata: { teachingWeek, status, weekCommencing: "2026-09-07" }
    }]
  } as ContentPackage;
}

/** 0.4.2-shaped live publication: catalogue blocks exist, but Week 1 IDs are the old retrieval/main/formative keys. */
function livePackageWithLegacyWeek1Ids(): ContentPackage {
  const block = {
    type: "single-choice",
    content: {
      prompt: "Legacy live prompt that must not replace bundled exercises.",
      options: [{ id: "a", label: "Legacy option" }]
    }
  };
  return {
    weeks: content.weeks,
    sessions: (content.sessions || []).map((session) => (
      session.id === "week-1-lesson-1"
        ? {
            ...session,
            relationships: {
              ...(session.relationships || {}),
              activities: [
                "week-1-lesson-1-retrieval",
                "week-1-lesson-1-main",
                "week-1-lesson-1-formative"
              ]
            }
          }
        : session
    )),
    activities: [
      { id: "week-1-lesson-1-retrieval", version: "0.1.0", metadata: { title: "Legacy retrieval" }, blocks: [block] },
      { id: "week-1-lesson-1-main", version: "0.1.0", metadata: { title: "Legacy main" }, blocks: [block] },
      { id: "week-1-lesson-1-formative", version: "0.1.0", metadata: { title: "Legacy formative" }, blocks: [block] }
    ]
  } as ContentPackage;
}

function DeferredCurriculum({
  live,
  children
}: {
  live: ContentPackage;
  children: (pkg: ContentPackage | null) => ReactNode;
}) {
  const [pkg, setPkg] = useState<ContentPackage | null>(null);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(live).then((next) => {
      if (!cancelled) setPkg(next);
    });
    return () => {
      cancelled = true;
    };
  }, [live]);
  return <>{children(pkg)}</>;
}

function expectReactTextBlock(root: HTMLElement, blockType: "short-response" | "reflection") {
  const block = root.querySelector(`[data-lp-block='${blockType}']`) as HTMLElement | null;
  expect(block).toBeTruthy();
  const field = block?.querySelector("textarea.lp-textarea[data-lp-response]") as HTMLTextAreaElement | null;
  expect(field).toBeTruthy();
  expect(field?.getAttribute("data-lp-min-chars")).toBeTruthy();
  expect(block?.querySelector("[data-lp-char-count]")).toBeTruthy();
  expect(within(block as HTMLElement).getByRole("button", { name: "Save response" })).toBeTruthy();
  expect(block?.querySelector("[data-lp-check]")).toBeNull();
}

describe("T Level presentation", () => {
  it("uses the UI catalogue required for inline week activities", () => {
    expect(InteractiveActivity).toBeTypeOf("function");
    expect(PracticeProgressPanel).toBeTypeOf("function");
    expect(CompletionModal).toBeTypeOf("function");
  });

  it("puts the SoL weeks on the home page and only opens available weeks", () => {
    render(<HomePage root="." />);
    expect(screen.getByRole("link", { name: "Open Week 1" }).getAttribute("href")).toBe("./week-1/");
    expect(screen.queryByRole("link", { name: "Open Week 2" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Open Week 22" })).toBeNull();
    expect(screen.getByText("Coming soon · week commencing 7 September 2026")).toBeTruthy();
    expect(screen.getAllByText(/Coming soon/).length).toBeGreaterThan(1);
    expect(screen.getByRole("link", { name: "Open Foundations" }).getAttribute("href")).toBe("./foundations/");
    expect(screen.queryByRole("link", { name: /Task 1/i })).toBeNull();
  });

  it("opens Week 2 on home when the published package marks it available", () => {
    render(<HomePage root="." pkg={withWeekStatus(content, { "week-2": "available" })} />);
    expect(screen.getByRole("link", { name: "Open Week 1" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Week 2" }).getAttribute("href")).toBe("./week-2/");
    expect(screen.queryByRole("link", { name: "Open Week 22" })).toBeNull();
  });

  it("unlocks Week 2 on home when live metadata matches by teachingWeek", () => {
    render(<HomePage root="." pkg={liveWeekByTeachingWeek(2, "available")} />);
    expect(screen.getByRole("link", { name: "Open Week 2" }).getAttribute("href")).toBe("./week-2/");
  });

  it("updates home after an async loadLatest package lands in React state", async () => {
    render(
      <DeferredCurriculum live={withWeekStatus(content, { "week-2": "available" })}>
        {(pkg) => <HomePage root="." pkg={pkg} />}
      </DeferredCurriculum>
    );
    expect(screen.queryByRole("link", { name: "Open Week 2" })).toBeNull();
    expect(await screen.findByRole("link", { name: "Open Week 2" })).toBeTruthy();
  });

  it("keeps bundled home weeks when a thin live package only overlays status", () => {
    const thin = {
      ...withWeekStatus(content, { "week-2": "available" }),
      sessions: [],
      activities: [],
      weeks: withWeekStatus(content, { "week-2": "available" }).weeks?.map((week) => ({
        ...week,
        relationships: { ...(week.relationships || {}), sessions: [] }
      }))
    } as ContentPackage;
    render(<HomePage root="." pkg={thin} />);
    expect(screen.getByRole("link", { name: "Open Week 1" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Week 2" })).toBeTruthy();
    expect(screen.getAllByText(/Week \d+/).length).toBeGreaterThan(2);
  });

  it("marks the current course section instead of hard-coding Foundations", () => {
    const { rerender } = render(<CourseSidebar currentPage="week-1" root=".." />);
    const nav = () => screen.getByRole("navigation", { name: "Course sections" });
    expect(within(nav()).getByRole("link", { name: /^Week 1(?!\d)/ }).getAttribute("aria-current")).toBe("page");
    expect(within(nav()).getByText("Current").closest("a")?.textContent).toMatch(/Week 1/);
    rerender(<CourseSidebar currentPage="foundations" root=".." />);
    expect(within(nav()).getByRole("link", { name: /Foundations/ }).getAttribute("aria-current")).toBe("page");
  });

  it("does not treat locked weeks as open links in the sidebar", () => {
    render(<CourseSidebar currentPage="home" root=".." pkg={content} />);
    const nav = screen.getByRole("navigation", { name: "Course sections" });
    expect(within(nav).getByRole("link", { name: /^Week 1(?!\d)/ })).toBeTruthy();
    expect(within(nav).queryByRole("link", { name: /^Week 2(?!\d)/ })).toBeNull();
    expect(within(nav).getByText(/^Week 2$/)).toBeTruthy();
    expect(within(nav).getAllByText("Coming soon").length).toBeGreaterThan(0);
  });

  it("unlocks Week 2 in the sidebar when live status is available by id or teachingWeek", () => {
    const { rerender } = render(
      <CourseSidebar currentPage="home" root=".." pkg={withWeekStatus(content, { "week-2": "available" })} />
    );
    const nav = () => screen.getByRole("navigation", { name: "Course sections" });
    expect(within(nav()).getByRole("link", { name: /^Week 2(?!\d)/ }).getAttribute("href")).toBe("../week-2/");
    rerender(<CourseSidebar currentPage="home" root=".." pkg={liveWeekByTeachingWeek(2, "available")} />);
    expect(within(nav()).getByRole("link", { name: /^Week 2(?!\d)/ })).toBeTruthy();
  });

  it("updates the sidebar after an async loadLatest package lands in React state", async () => {
    render(
      <DeferredCurriculum live={withWeekStatus(content, { "week-2": "available" })}>
        {(pkg) => <CourseSidebar currentPage="home" root=".." pkg={pkg} />}
      </DeferredCurriculum>
    );
    const nav = () => screen.getByRole("navigation", { name: "Course sections" });
    expect(within(nav()).queryByRole("link", { name: /^Week 2(?!\d)/ })).toBeNull();
    expect(await screen.findByRole("link", { name: /^Week 2(?!\d)/ })).toBeTruthy();
  });

  it("builds nested breadcrumbs for Foundations activities", () => {
    const items = breadcrumbs({
      page: "foundations",
      section: "foundations",
      root: "../..",
      activity: "programming-diagnostic"
    });
    expect(items.map((item) => item.label)).toEqual([
      "Course home",
      "Foundations",
      "Programming Diagnostic"
    ]);
  });

  it("falls back to bundled SoL when the live package has no week catalogue blocks", () => {
    const empty = { ...content, weeks: [], activities: [] };
    render(<WeekPage weekId="week-1" root=".." pkg={empty} />);
    expect(screen.getByRole("heading", { name: /Lesson 1:/i })).toBeTruthy();
    expect(screen.getByText("T Level Digital Software Development")).toBeTruthy();
  });

  it("shows three lessons plus homework as inline sessions on a week page", () => {
    const { container } = render(<WeekPage weekId="week-1" root=".." pkg={content} />);
    expect(screen.getByText("T Level Digital Software Development")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Lesson 1:/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Lesson 2:/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Lesson 3:/i })).toBeTruthy();
    expect(screen.getAllByRole("heading", { name: /Homework:/i }).length).toBeGreaterThan(0);
    expect(container.querySelector("#week-1-homework")).toBeTruthy();
    expect(container.querySelector("[data-lp-activity='week-1-lesson-1-ex-01']")).toBeTruthy();
    expect(container.querySelectorAll("[data-lp-activity^='week-1-lesson-1-']").length).toBeGreaterThanOrEqual(25);
    expect(container.querySelectorAll("[data-lp-activity^='week-1-lesson-1-']").length).toBeLessThanOrEqual(30);
    expect(container.querySelector("[href*='/week-1/'][href*='lesson']")).toBeNull();
    const panel = screen.getByRole("complementary", { name: /Practice progress/ });
    expect(panel.getAttribute("data-lp-docked")).toBe("left");
    expect(panel.getAttribute("data-lp-collapsed")).toBe("true");
    const expectedActivities = accessibleWeekActivityTotal(content, "week-1");
    expect(within(panel).getByText(`Practice progress: 0 / ${expectedActivities} activities completed`)).toBeTruthy();
  });

  it("renders Week 1 single-choice, classification and short-response inline", () => {
    const { container } = render(<WeekPage weekId="week-1" root=".." pkg={content} />);
    const choice = container.querySelector(`[data-lp-activity="${week1Lesson1ActivityId("single-choice")}"]`) as HTMLElement;
    const classify = container.querySelector(`[data-lp-activity="${week1Lesson1ActivityId("classification")}"]`) as HTMLElement;
    const written = container.querySelector(`[data-lp-activity="${week1Lesson1ActivityId("short-response")}"]`) as HTMLElement;
    const match = container.querySelector(`[data-lp-activity="${week1Lesson1ActivityId("drag-drop")}"]`) as HTMLElement;

    expect(choice.querySelector("[data-lp-block='option-cards']")).toBeTruthy();
    expect(within(choice).getAllByRole("radio").length).toBeGreaterThan(0);
    expect(classify.querySelector("[data-lp-block='classification']")).toBeTruthy();
    expect(within(classify).getByRole("button", { name: "Check types" })).toBeTruthy();
    expect(classify.querySelector("[data-lp-sort-board]")).toBeNull();
    expectReactTextBlock(written, "short-response");
    expect(match.querySelector("[data-lp-block='drag-drop']")).toBeTruthy();
  });

  it("renders Week 1 exercise content, not empty Untitled activity cards", () => {
    const { container } = render(<WeekPage weekId="week-1" root=".." pkg={content} />);
    const ex01 = container.querySelector("[data-lp-activity='week-1-lesson-1-ex-01']") as HTMLElement;
    expect(ex01).toBeTruthy();
    expect(within(ex01).getByRole("heading", { name: "Who is the client?" })).toBeTruthy();
    expect(within(ex01).getByText("Who is the client in the Oakfield scenario?")).toBeTruthy();
    expect(screen.queryByText("Untitled activity")).toBeNull();
    expect(container.querySelector(`[data-lp-activity="${week1Lesson1ActivityId("single-choice")}"] [data-lp-block='option-cards']`)).toBeTruthy();
    expect(container.querySelector(`[data-lp-activity="${week1Lesson1ActivityId("classification")}"] [data-lp-block='classification']`)).toBeTruthy();
    expect(container.querySelector(`[data-lp-activity="${week1Lesson1ActivityId("drag-drop")}"] [data-lp-block='drag-drop']`)).toBeTruthy();
    expect(container.querySelector(`[data-lp-activity="${week1Lesson1ActivityId("short-response")}"] [data-lp-block='short-response']`)).toBeTruthy();
  });

  it("keeps bundled Week 1 exercise content when live catalogue activities use legacy IDs", () => {
    const { container } = render(
      <WeekPage weekId="week-1" root=".." pkg={livePackageWithLegacyWeek1Ids()} />
    );
    expect(screen.queryByText("Untitled activity")).toBeNull();
    const ex01 = container.querySelector("[data-lp-activity='week-1-lesson-1-ex-01']") as HTMLElement;
    expect(ex01).toBeTruthy();
    expect(within(ex01).getByRole("heading", { name: "Who is the client?" })).toBeTruthy();
    expect(within(ex01).getByText("Who is the client in the Oakfield scenario?")).toBeTruthy();
    expect(container.querySelector("[data-lp-block='option-cards']")).toBeTruthy();
    expect(container.querySelector("[data-lp-block='classification']")).toBeTruthy();
    expect(container.querySelector("[data-lp-block='drag-drop']")).toBeTruthy();
    expect(container.querySelector("[data-lp-block='short-response']")).toBeTruthy();
  });

  it("renders Week 1 exercise content from a learner-safe live package", () => {
    const { container } = render(
      <WeekPage weekId="week-1" root=".." pkg={learnerSafePackage(content)} />
    );
    const ex01 = container.querySelector("[data-lp-activity='week-1-lesson-1-ex-01']") as HTMLElement;
    expect(ex01).toBeTruthy();
    expect(within(ex01).getByRole("heading", { name: "Who is the client?" })).toBeTruthy();
    expect(within(ex01).getByText("Who is the client in the Oakfield scenario?")).toBeTruthy();
    expect(screen.queryByText("Untitled activity")).toBeNull();
    expect(container.querySelector("[data-lp-block='option-cards']")).toBeTruthy();
    expect(container.querySelector("[data-lp-block='classification']")).toBeTruthy();
    expect(container.querySelector("[data-lp-block='drag-drop']")).toBeTruthy();
    expect(container.querySelector("[data-lp-block='short-response']")).toBeTruthy();
  });

  it("shows the Oakfield scenario before any Week 1 exercise and does not repeat the full brief in Lesson 1", () => {
    const { container } = render(<WeekPage weekId="week-1" root=".." pkg={content} />);
    const scenario = container.querySelector("[data-lp-client-scenario]") as HTMLElement;
    const firstActivity = container.querySelector("[data-lp-activity]") as HTMLElement;
    const lessonActivities = container.querySelectorAll("[data-lp-activity^='week-1-lesson-1-']");
    expect(scenario).toBeTruthy();
    expect(within(scenario).getByRole("heading", { name: "Oakfield Adult Skills Hub: Client Scenario" })).toBeTruthy();
    expect(scenario.textContent).toMatch(/local-authority adult education provider/);
    expect(scenario.textContent).toMatch(/You will use the Oakfield scenario throughout this course/);
    expect(firstActivity).toBeTruthy();
    expect(scenario.compareDocumentPosition(firstActivity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    lessonActivities.forEach((node) => {
      expect(node.textContent).not.toMatch(/local-authority adult education provider/);
    });
    expect(container.querySelectorAll("[data-lp-client-scenario]")).toHaveLength(1);
  });

  it("does not mount planned Week 1 sessions", () => {
    const { container } = render(<WeekPage weekId="week-1" root=".." pkg={content} />);
    expect(container.querySelector("[data-lp-activity='week-1-lesson-1-ex-01']")).toBeTruthy();
    expect(container.querySelector("[data-lp-activity='week-1-lesson-2-ex-01']")).toBeNull();
    expect(container.querySelector("[data-lp-activity='week-1-lesson-3-ex-01']")).toBeNull();
    expect(container.querySelector("[data-lp-activity='week-1-homework-product']")).toBeNull();
    expect(screen.getAllByText("Not released yet").length).toBe(3);
  });

  it("blocks a direct week URL when the package status is not available", () => {
    const { container } = render(<WeekPage weekId="week-2" root=".." pkg={content} />);
    expect(screen.getByRole("heading", { name: "Coming soon" })).toBeTruthy();
    expect(screen.getByText(/planned to commence 7 September 2026/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to course home" })).toBeTruthy();
    expect(container.querySelector("[data-lp-activity]")).toBeNull();
    expect(container.querySelector("[data-lp-week-locked]")).toBeTruthy();
    expect(screen.queryByRole("complementary", { name: /Practice progress/ })).toBeNull();
  });

  it("renders Week 2 inline exercises when the published package marks it available", () => {
    const { container } = render(
      <WeekPage weekId="week-2" root=".." pkg={withWeekStatus(content, { "week-2": "available" })} />
    );
    const retrieval = container.querySelector('[data-lp-activity="week-2-lesson-1-retrieval"]') as HTMLElement;
    const classify = container.querySelector('[data-lp-activity="week-2-lesson-1-formative"]') as HTMLElement;
    const written = container.querySelector('[data-lp-activity="week-2-lesson-1-main"]') as HTMLElement;

    expect(retrieval.querySelector("[data-lp-block='option-cards']")).toBeTruthy();
    expect(classify.querySelector("[data-lp-block='classification']")).toBeTruthy();
    expect(classify.querySelector("[data-lp-sort-board]")).toBeNull();
    expect(within(classify).getByRole("button", { name: "Check types" })).toBeTruthy();
    expectReactTextBlock(written, "short-response");
  });

  it("unlocks Week 2 activities when live metadata matches by teachingWeek", () => {
    const { container } = render(
      <WeekPage weekId="week-2" root=".." pkg={liveWeekByTeachingWeek(2, "available")} />
    );
    expect(container.querySelector("[data-lp-activity='week-2-lesson-1-retrieval']")).toBeTruthy();
    expect(container.querySelector("[data-lp-week-locked]")).toBeNull();
  });

  it("keeps Week 2 locked when a live package with catalogue blocks still marks it planned", () => {
    const { container } = render(<WeekPage weekId="week-2" root=".." pkg={content} />);
    expect(screen.getByRole("heading", { name: "Coming soon" })).toBeTruthy();
    expect(container.querySelector("[data-lp-activity]")).toBeNull();
  });

  it("updates a week page after an async loadLatest package marks it available", async () => {
    const { rerender } = render(<WeekPage weekId="week-2" root=".." pkg={null} />);
    expect(screen.getByRole("heading", { name: "Coming soon" })).toBeTruthy();
    rerender(<WeekPage weekId="week-2" root=".." pkg={withWeekStatus(content, { "week-2": "available" })} />);
    expect(await screen.findByRole("heading", { name: /Lesson 1:/i })).toBeTruthy();
  });

  it("renders Week 3 single-choice, classification and short-response inline", () => {
    const { container } = render(
      <WeekPage weekId="week-3" root=".." pkg={withWeekStatus(content, { "week-3": "available" })} />
    );
    const retrieval = container.querySelector('[data-lp-activity="week-3-lesson-1-retrieval"]') as HTMLElement;
    const classify = container.querySelector('[data-lp-activity="week-3-lesson-1-formative"]') as HTMLElement;
    const written = container.querySelector('[data-lp-activity="week-3-lesson-1-main"]') as HTMLElement;

    expect(retrieval.querySelector("[data-lp-block='option-cards']")).toBeTruthy();
    expect(classify.querySelector("[data-lp-block='classification']")).toBeTruthy();
    expect(classify.querySelector("[data-lp-sort-board]")).toBeNull();
    expect(within(classify).getByRole("button", { name: "Check types" })).toBeTruthy();
    expectReactTextBlock(written, "short-response");
  });

  it("counts accessible learner-visible activities, not scorable items or planned sessions", () => {
    const { container } = render(<WeekPage weekId="week-1" root=".." pkg={content} />);
    const expected = accessibleWeekActivityTotal(content, "week-1");
    const lesson1 = content.sessions?.find((session) => session.id === "week-1-lesson-1");
    const lesson1Count = (lesson1?.relationships?.activities || []).length;
    const classifyId = week1Lesson1ActivityId("classification");
    const dragId = week1Lesson1ActivityId("drag-drop");
    const writtenId = week1Lesson1ActivityId("short-response");
    const classifyItems = week1ActivityItemCount(classifyId);
    const dragItems = week1ActivityItemCount(dragId);
    const panel = screen.getByRole("complementary", { name: /Practice progress/ });

    expect(expected).toBe(lesson1Count);
    expect(expected).toBe(container.querySelectorAll("[data-lp-activity^='week-1-lesson-1-']").length);
    expect(classifyItems).toBeGreaterThan(1);
    expect(dragItems).toBeGreaterThan(1);
    expect(container.querySelector(`[data-lp-activity="${writtenId}"] [data-lp-block='short-response']`)).toBeTruthy();
    expect(within(panel).getByText(`Practice progress: 0 / ${expected} activities completed`)).toBeTruthy();
    expect(within(panel).queryByText(/of \d+ correct/)).toBeNull();
    expect(within(panel).queryByText(new RegExp(`0 / ${classifyItems}`))).toBeNull();
    expect(within(panel).queryByText(new RegExp(`0 / ${expected + plannedWeek1ActivityCount()}`))).toBeNull();
    expect(screen.getAllByText("Not released yet").length).toBe(3);
  });

  it("increments activity progress by 1 after completing one Lesson 1 exercise", async () => {
    const { container } = render(<WeekPage weekId="week-1" root=".." pkg={content} />);
    const expected = accessibleWeekActivityTotal(content, "week-1");
    const panel = screen.getByRole("complementary", { name: /Practice progress/ });
    expect(within(panel).getByText(`Practice progress: 0 / ${expected} activities completed`)).toBeTruthy();

    const choice = container.querySelector(`[data-lp-activity="${week1Lesson1ActivityId("single-choice")}"]`) as HTMLElement;
    fireEvent.click(within(choice).getAllByRole("radio")[0]);
    fireEvent.click(within(choice).getByRole("button", { name: "Check answer" }));

    await waitFor(() => {
      expect(within(panel).getByText(`Practice progress: 1 / ${expected} activities completed`)).toBeTruthy();
    });
    expect(screen.queryByRole("dialog", { name: /Practice complete/i })).toBeNull();
    expect(within(panel).queryByText(/of \d+ correct/)).toBeNull();
    expect(container.querySelector("[data-lp-activity='week-1-lesson-1-ex-01']")).toBeTruthy();
  });

  it("opens CompletionModal with week badge after classification Check", async () => {
    const { container } = render(<WeekPage weekId="week-1" root=".." pkg={content} />);
    const expected = accessibleWeekActivityTotal(content, "week-1");
    const classifyId = week1Lesson1ActivityId("classification");
    const classifyItems = week1ActivityItemCount(classifyId);
    expect(classifyItems).toBeGreaterThan(1);
    const classify = await waitFor(() => {
      const node = container.querySelector(`[data-lp-activity="${classifyId}"]`);
      expect(node).toBeTruthy();
      return node as HTMLElement;
    });

    expect(screen.queryByRole("dialog", { name: /Practice complete/i })).toBeNull();

    const selects = within(classify).getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(1);
    for (const select of selects) {
      const options = within(select).getAllByRole("option").filter((option) => (option as HTMLOptionElement).value);
      fireEvent.change(select, { target: { value: (options[0] as HTMLOptionElement).value } });
    }
    fireEvent.click(within(classify).getByRole("button", { name: "Check types" }));

    const dialog = await waitFor(() => screen.getByRole("dialog", { name: /Practice complete/i }));
    expect(within(dialog).getByText(/Week 1:/i)).toBeTruthy();
    expect(within(dialog).queryByText(/of \d+ correct/)).toBeNull();
    const panel = screen.getByRole("complementary", { name: /Practice progress/ });
    expect(within(panel).getByText(`Practice progress: 1 / ${expected} activities completed`)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Practice complete/i })).toBeNull();
    });
  });

  it("persists React text results as trimmed strings, not empty objects", () => {
    expect(persistableResponse(
      { id: "note", type: "short-response" },
      { completed: true, correct: null, attempts: 1, responses: "  typed answer  " }
    )).toBe("typed answer");
    expect(persistableResponse(
      { id: "choice", type: "single-choice" },
      { completed: true, correct: true, attempts: 1, responses: { optionId: "a" } }
    )).toBe("a");
    expect(persistableResponse(
      { id: "sort", type: "classification" },
      { completed: true, correct: true, attempts: 1, responses: { one: "client" } }
    )).toEqual({ one: "client" });
  });
});
