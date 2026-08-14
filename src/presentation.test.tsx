import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CourseSidebar } from "./components/CourseSidebar";
import { HomePage } from "./pages/HomePage";
import { breadcrumbs } from "./page-copy";

afterEach(cleanup);

describe("T Level presentation", () => {
  it("keeps Foundations, Tasks and Projects as the home starting points", () => {
    render(<HomePage root="." />);
    expect(screen.getByRole("link", { name: "Open Foundations" }).getAttribute("href")).toBe("./foundations/");
    expect(screen.getByRole("link", { name: "Open Course Guide" }).getAttribute("href")).toBe("./course-guide/");
    expect(screen.getByRole("link", { name: "Open Projects" }).getAttribute("href")).toBe("./projects/");
    expect(screen.queryByText(/Week 1/i)).toBeNull();
  });

  it("marks the current course section instead of hard-coding Foundations", () => {
    const { rerender } = render(<CourseSidebar currentPage="task-2" root=".." />);
    const nav = () => screen.getByRole("navigation", { name: "Course sections" });
    expect(within(nav()).getByRole("link", { name: /Task 2/ }).getAttribute("aria-current")).toBe("page");
    expect(within(nav()).getByText("Current").closest("a")?.textContent).toMatch(/Task 2/);
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
});
