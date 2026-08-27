import type { ReactNode } from "react";
import bundledPackage from "../../content/tlevel-software-development/package.json";
import { APP_CONFIG } from "../config";
import {
  homeWeeksFromPackage,
  overlayLiveWeekMetadata,
  type ContentPackage
} from "../curriculum/from-package";
import { createSitePath, navigationItems } from "../paths";

type CourseSidebarProps = {
  currentPage: string;
  root: string;
  pkg?: ContentPackage | null;
};

type SidebarItem = {
  id: string;
  label: string;
  path: string;
  openable: boolean;
  status?: string;
};

const COURSE_SECTION_IDS = APP_CONFIG.courseSectionIds as readonly string[];

function sidebarItems(root: string, pkg?: ContentPackage | null): SidebarItem[] {
  const weeks = homeWeeksFromPackage(
    overlayLiveWeekMetadata(bundledPackage as ContentPackage, pkg)
  ).map((week) => ({
    id: week.id,
    label: week.label,
    path: week.path,
    openable: week.openable,
    status: week.status
  }));
  const staticSections = APP_CONFIG.navigation.filter((item) => COURSE_SECTION_IDS.includes(item.id));
  const home = staticSections.filter((item) => item.id === "home");
  const rest = staticSections.filter((item) => item.id !== "home");
  return [
    ...navigationItems(home, root).map((item) => ({ ...item, openable: true })),
    ...weeks.map((week) => ({
      ...week,
      path: createSitePath(root, week.path)
    })),
    ...navigationItems(rest, root).map((item) => ({ ...item, openable: true }))
  ];
}

export function CourseSidebar({ currentPage, root, pkg }: CourseSidebarProps) {
  const sections = sidebarItems(root, pkg);

  return (
    <aside className="course-navigation" aria-labelledby="course-navigation-title">
      <h2 className="course-navigation__title" id="course-navigation-title">Course sections</h2>
      <nav aria-label="Course sections">
        <ul className="course-navigation__list">
          {sections.map((item) => {
            const isCurrent = item.id === currentPage;
            const phaseBadge = isCurrent ? <span className="phase-badge">Current</span> : (
              item.openable ? null : (
                <span className="phase-badge">{item.status === "archived" ? "Archived" : "Coming soon"}</span>
              )
            );
            const displayLabel = item.id === "home" ? "Course home" : item.label;
            const content = (
              <>
                <span>{displayLabel}</span>
                {phaseBadge}
              </>
            );
            return (
              <li className="course-navigation__item" key={item.id}>
                {item.openable ? (
                  <a
                    className="course-navigation__link"
                    href={item.path}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {content}
                  </a>
                ) : (
                  <span
                    className="course-navigation__link course-navigation__link--locked"
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {content}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export function CourseLayout({
  currentPage,
  root,
  pkg,
  children
}: CourseSidebarProps & { children: ReactNode }) {
  return (
    <div className="study-layout page-width">
      <CourseSidebar currentPage={currentPage} root={root} pkg={pkg} />
      <div className="study-main">{children}</div>
    </div>
  );
}
