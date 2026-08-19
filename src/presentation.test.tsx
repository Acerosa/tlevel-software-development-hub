import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CourseSidebar } from "./components/CourseSidebar";
import { HomePage } from "./pages/HomePage";
import { breadcrumbs } from "./page-copy";

afterEach(cleanup);

describe("T Level presentation", () => {
  it("puts Weeks 1 to 3 on the home page as the teaching starting points", () => {
    render(<HomePage root="." />);
    expect(screen.getByRole("link", { name: "Open Week 1" }).getAttribute("href")).toBe("./week-1/");
    expect(screen.getByRole("link", { name: "Open Week 2" }).getAttribute("href")).toBe("./week-2/");
    expect(screen.getByRole("link", { name: "Open Week 3" }).getAttribute("href")).toBe("./week-3/");
    expect(screen.getByRole("link", { name: "Open Foundations" }).getAttribute("href")).toBe("./foundations/");
    expect(screen.queryByRole("link", { name: /Task 1/i })).toBeNull();
  });

  it("marks the current course section instead of hard-coding Foundations", () => {
    const { rerender } = render(<CourseSidebar currentPage="week-2" root=".." />);
    const nav = () => screen.getByRole("navigation", { name: "Course sections" });
    expect(within(nav()).getByRole("link", { name: /Week 2/ }).getAttribute("aria-current")).toBe("page");
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
});
