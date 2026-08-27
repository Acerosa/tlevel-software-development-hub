import { CompletionModal, InteractiveActivity, PracticeProgressPanel } from "@learning-platform/ui";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import pkg from "../content/tlevel-software-development/package.json";
import { CourseSidebar } from "./components/CourseSidebar";
import { type ContentPackage } from "./curriculum/from-package";
import { HomePage } from "./pages/HomePage";
import { persistableResponse, WeekPage } from "./pages/WeekPage";
import { breadcrumbs } from "./page-copy";

const content = pkg as ContentPackage;

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
    const { rerender } = render(<CourseSidebar currentPage="week-2" root=".." />);
    const nav = () => screen.getByRole("navigation", { name: "Course sections" });
    expect(within(nav()).getByRole("link", { name: /^Week 2(?!\d)/ }).getAttribute("aria-current")).toBe("page");
    expect(within(nav()).getByText("Current").closest("a")?.textContent).toMatch(/Week 2/);
    rerender(<CourseSidebar currentPage="foundations" root=".." />);
    expect(within(nav()).getByRole("link", { name: /Foundations/ }).getAttribute("aria-current")).toBe("page");
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
    expect(container.querySelector("[data-lp-activity='week-1-lesson-1-retrieval']")).toBeTruthy();
    expect(container.querySelector("[href*='/week-1/'][href*='lesson']")).toBeNull();
    const panel = screen.getByRole("complementary", { name: "Practice progress" });
    expect(panel.getAttribute("data-lp-docked")).toBe("left");
    expect(panel.getAttribute("data-lp-collapsed")).toBe("true");
    expect(within(panel).getByText(/\d+ \/ \d+/)).toBeTruthy();
  });

  it("renders Week 1 single-choice, classification and short-response inline", () => {
    const { container } = render(<WeekPage weekId="week-1" root=".." pkg={content} />);
    const retrieval = container.querySelector('[data-lp-activity="week-1-lesson-1-retrieval"]') as HTMLElement;
    const classify = container.querySelector('[data-lp-activity="week-1-lesson-1-formative"]') as HTMLElement;
    const written = container.querySelector('[data-lp-activity="week-1-lesson-1-main"]') as HTMLElement;

    expect(retrieval.querySelector("[data-lp-block='option-cards']")).toBeTruthy();
    expect(within(retrieval).getAllByRole("radio").length).toBeGreaterThan(0);
    expect(classify.querySelector("[data-lp-block='classification']")).toBeTruthy();
    expect(within(classify).getByRole("button", { name: "Check types" })).toBeTruthy();
    expect(classify.querySelector("[data-lp-sort-board]")).toBeNull();
    expectReactTextBlock(written, "short-response");
  });

  it("blocks a direct week URL when the package status is not available", () => {
    const { container } = render(<WeekPage weekId="week-2" root=".." pkg={content} />);
    expect(screen.getByRole("heading", { name: "Coming soon" })).toBeTruthy();
    expect(screen.getByText(/planned to commence 7 September 2026/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to course home" })).toBeTruthy();
    expect(container.querySelector("[data-lp-activity]")).toBeNull();
    expect(container.querySelector("[data-lp-week-locked]")).toBeTruthy();
    expect(screen.queryByRole("complementary", { name: "Practice progress" })).toBeNull();
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

  it("opens CompletionModal with week badge after classification Check", async () => {
    const { container } = render(<WeekPage weekId="week-1" root=".." pkg={content} />);
    const classify = await waitFor(() => {
      const node = container.querySelector('[data-lp-activity="week-1-lesson-1-formative"]');
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
