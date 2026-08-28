import { cleanup, render, screen, within } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import pkg from "../content/tlevel-software-development/package.json";
import { CourseSidebar } from "./components/CourseSidebar";
import { overlayLiveWeekMetadata, type ContentPackage } from "./curriculum/from-package";
import { HomePage } from "./pages/HomePage";
import { WeekPage } from "./pages/WeekPage";

const bundled = pkg as ContentPackage;

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

describe("live week visibility", () => {
  it("Test 1 — Post Week: live Week 1 and 2 available, Week 3 planned", () => {
    const live = withWeekStatus(bundled, {
      "week-1": "available",
      "week-2": "available",
      "week-3": "planned"
    });

    const { unmount: unmountHome } = render(<HomePage root="." pkg={live} />);
    expect(screen.getByRole("link", { name: "Open Week 1" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Week 2" }).getAttribute("href")).toBe("./week-2/");
    expect(screen.queryByRole("link", { name: "Open Week 3" })).toBeNull();
    unmountHome();

    const { unmount: unmountNav } = render(<CourseSidebar currentPage="home" root="." pkg={live} />);
    const nav = screen.getByRole("navigation", { name: "Course sections" });
    expect(within(nav).getByRole("link", { name: /^Week 2(?!\d)/ })).toBeTruthy();
    expect(within(nav).queryByRole("link", { name: /^Week 3(?!\d)/ })).toBeNull();
    unmountNav();

    const { container } = render(<WeekPage weekId="week-2" root=".." pkg={live} />);
    expect(container.querySelector("[data-lp-activity='week-2-lesson-1-retrieval']")).toBeTruthy();
    expect(container.querySelector("[data-lp-week-locked]")).toBeNull();
  });

  it("Test 2 — Remove Week: live Week 2 planned is not openable", () => {
    const live = withWeekStatus(bundled, { "week-2": "planned" });

    const { unmount: unmountHome } = render(<HomePage root="." pkg={live} />);
    expect(screen.queryByRole("link", { name: "Open Week 2" })).toBeNull();
    unmountHome();

    const { unmount: unmountNav } = render(<CourseSidebar currentPage="home" root="." pkg={live} />);
    const nav = screen.getByRole("navigation", { name: "Course sections" });
    expect(within(nav).queryByRole("link", { name: /^Week 2(?!\d)/ })).toBeNull();
    expect(within(nav).getByText(/^Week 2$/)).toBeTruthy();
    unmountNav();

    const { container } = render(<WeekPage weekId="week-2" root=".." pkg={live} />);
    expect(screen.getByRole("heading", { name: "Coming soon" })).toBeTruthy();
    expect(container.querySelector("[data-lp-activity]")).toBeNull();
  });

  it("Test 3 — live publication status overrides bundled status both ways", () => {
    const bundledPlanned = withWeekStatus(bundled, { "week-2": "planned" });
    const liveAvailable = withWeekStatus(bundled, { "week-2": "available" });
    expect(overlayLiveWeekMetadata(bundledPlanned, liveAvailable).weeks?.find((week) => week.id === "week-2")?.metadata?.status)
      .toBe("available");
    render(<HomePage root="." pkg={liveAvailable} />);
    expect(screen.getByRole("link", { name: "Open Week 2" })).toBeTruthy();
    cleanup();

    const bundledAvailable = withWeekStatus(bundled, { "week-2": "available" });
    const livePlanned = withWeekStatus(bundled, { "week-2": "planned" });
    expect(overlayLiveWeekMetadata(bundledAvailable, livePlanned).weeks?.find((week) => week.id === "week-2")?.metadata?.status)
      .toBe("planned");
    const { unmount } = render(<HomePage root="." pkg={livePlanned} />);
    expect(screen.queryByRole("link", { name: "Open Week 2" })).toBeNull();
    unmount();
    const { container } = render(<WeekPage weekId="week-2" root=".." pkg={livePlanned} />);
    expect(screen.getByRole("heading", { name: "Coming soon" })).toBeTruthy();
    expect(container.querySelector("[data-lp-activity]")).toBeNull();
  });

  it("Test 4 — async hydration updates home and sidebar from the live package", async () => {
    const live = withWeekStatus(bundled, { "week-2": "available" });
    render(
      <DeferredCurriculum live={live}>
        {(pkg) => (
          <>
            <CourseSidebar currentPage="home" root="." pkg={pkg} />
            <HomePage root="." pkg={pkg} />
          </>
        )}
      </DeferredCurriculum>
    );
    expect(screen.queryByRole("link", { name: "Open Week 2" })).toBeNull();
    expect(within(screen.getByRole("navigation", { name: "Course sections" })).queryByRole("link", { name: /^Week 2(?!\d)/ })).toBeNull();
    expect(await screen.findByRole("link", { name: "Open Week 2" })).toBeTruthy();
    expect(within(screen.getByRole("navigation", { name: "Course sections" })).getByRole("link", { name: /^Week 2(?!\d)/ })).toBeTruthy();
  });

  it("Test 5 — archived weeks cannot open", () => {
    const live = withWeekStatus(bundled, { "week-2": "archived" });

    const { unmount: unmountHome } = render(<HomePage root="." pkg={live} />);
    expect(screen.queryByRole("link", { name: "Open Week 2" })).toBeNull();
    expect(screen.getByText("This week is archived")).toBeTruthy();
    unmountHome();

    const { unmount: unmountNav } = render(<CourseSidebar currentPage="home" root="." pkg={live} />);
    const nav = screen.getByRole("navigation", { name: "Course sections" });
    expect(within(nav).queryByRole("link", { name: /^Week 2(?!\d)/ })).toBeNull();
    expect(within(nav).queryByText(/^Week 2$/)).toBeNull();
    unmountNav();

    const { container } = render(<WeekPage weekId="week-2" root=".." pkg={live} />);
    expect(screen.getByRole("heading", { name: "This week is archived" })).toBeTruthy();
    expect(container.querySelector("[data-lp-activity]")).toBeNull();
  });
});
