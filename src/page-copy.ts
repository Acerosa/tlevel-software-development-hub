import type { BreadcrumbItem } from "@learning-platform/ui";
import type { PageContext } from "./page-context";

const ACTIVITY_COPY: Record<string, { title: string; subtitle: string; note?: string }> = {
  "programming-diagnostic": {
    title: "Programming Diagnostic",
    subtitle: "Read, complete and debug code in Python, JavaScript or C#, then identify the areas worth revisiting.",
    note: "This diagnostic is formative. It is not a qualification grade, and you can retry any section."
  },
  "requirements-classification": {
    title: "Requirements Classification",
    subtitle: "Classify realistic requirements and recognise wording that can support acceptance testing."
  },
  "problem-decomposition": {
    title: "Problem Decomposition",
    subtitle: "Break a community sports centre system into manageable technical problems and implementation tasks."
  },
  "data-design": {
    title: "Data Design Knowledge Check",
    subtitle: "Use a college clubs dataset to check your understanding of data types, keys, relationships and validation."
  },
  "testing-methods": {
    title: "Testing Methods Classification",
    subtitle: "Choose suitable testing methods, connect each method to its purpose and follow testing into iteration."
  }
};

const PAGE_COPY: Record<string, { title: string; subtitle: string }> = {
  home: {
    title: "Course home",
    subtitle: "Find course materials, project guidance and assessment preparation."
  },
  "course-guide": {
    title: "Course Guide",
    subtitle: "Use this page to understand the main sections of the hub."
  },
  foundations: {
    title: "Software Development Foundations",
    subtitle: "Build and check the core software development skills you will use throughout the Occupational Specialism."
  },
  projects: {
    title: "Projects",
    subtitle: "Guidance and tools for project work."
  },
  "task-1": {
    title: "Task 1",
    subtitle: "Materials for the first occupational specialism task."
  },
  "task-2": {
    title: "Task 2",
    subtitle: "Materials for the second occupational specialism task."
  },
  "task-3": {
    title: "Task 3",
    subtitle: "Materials for the third occupational specialism task."
  },
  "assessment-practice": {
    title: "Assessment Practice",
    subtitle: "Practice materials for the occupational specialism tasks."
  },
  resources: {
    title: "Resources",
    subtitle: "Reference material and course documents."
  },
  help: {
    title: "Help",
    subtitle: "Guidance for finding and using course materials."
  }
};

export function activityCopy(activityId?: string) {
  return activityId ? ACTIVITY_COPY[activityId] : undefined;
}

export function pageHeader(context: PageContext): { title: string; subtitle: string } {
  const activity = activityCopy(context.activity);
  if (activity) return { title: activity.title, subtitle: activity.subtitle };
  return PAGE_COPY[context.page] || PAGE_COPY.home;
}

export function breadcrumbs(context: PageContext): BreadcrumbItem[] {
  const home = { label: "Course home", path: "" };
  if (context.page === "home" && !context.activity) return [home];
  if (context.activity) {
    const copy = activityCopy(context.activity);
    return [
      home,
      { label: "Foundations", path: "foundations/" },
      { label: copy?.title || "Activity" }
    ];
  }
  const header = pageHeader(context);
  return [home, { label: header.title }];
}
