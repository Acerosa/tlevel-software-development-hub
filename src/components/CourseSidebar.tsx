import type { ReactNode } from "react";
import { APP_CONFIG } from "../config";
import { navigationItems } from "../paths";

type CourseSidebarProps = {
  currentPage: string;
  root: string;
};

const COURSE_SECTION_IDS = APP_CONFIG.courseSectionIds as readonly string[];

export function CourseSidebar({ currentPage, root }: CourseSidebarProps) {
  const sections = navigationItems(
    APP_CONFIG.navigation.filter((item) => COURSE_SECTION_IDS.includes(item.id)),
    root
  );

  return (
    <aside className="course-navigation" aria-labelledby="course-navigation-title">
      <h2 className="course-navigation__title" id="course-navigation-title">Course sections</h2>
      <nav aria-label="Course sections">
        <ul className="course-navigation__list">
          {sections.map((item) => {
            const isCurrent = item.id === currentPage;
            const phaseBadge = isCurrent ? <span className="phase-badge">Current</span> : null;
            const displayLabel = item.id === "home" ? "Course home" : item.label;
            return (
              <li className="course-navigation__item" key={item.id}>
                <a
                  className="course-navigation__link"
                  href={item.path}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  <span>{displayLabel}</span>
                  {phaseBadge}
                </a>
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
  children
}: CourseSidebarProps & { children: ReactNode }) {
  return (
    <div className="study-layout page-width">
      <CourseSidebar currentPage={currentPage} root={root} />
      <div className="study-main">{children}</div>
    </div>
  );
}
