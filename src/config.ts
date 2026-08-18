export const APP_CONFIG = Object.freeze({
  hubId: "tlevel-software-development",
  courseKey: "t-level-digital-software-development",
  hubVersion: "0.1.0",
  siteName: "T Level Digital Software Development Hub",
  shortName: "Software Development Hub",
  qualification: "T Level Digital",
  coreVersion: "0.2.0",
  learnerApiContractVersion: "0.1.0",
  submissionContractVersion: "0.1.0",
  currentPhase: "Phase 1: Technical Foundations",
  navigation: Object.freeze([
    Object.freeze({ id: "home", label: "Home", path: "" }),
    Object.freeze({ id: "course-guide", label: "Course Guide", path: "course-guide/" }),
    Object.freeze({ id: "foundations", label: "Foundations", path: "foundations/" }),
    Object.freeze({ id: "projects", label: "Projects", path: "projects/" }),
    Object.freeze({ id: "task-1", label: "Task 1", path: "task-1/" }),
    Object.freeze({ id: "task-2", label: "Task 2", path: "task-2/" }),
    Object.freeze({ id: "task-3", label: "Task 3", path: "task-3/" }),
    Object.freeze({
      id: "assessment-practice",
      label: "Assessment Practice",
      path: "assessment-practice/"
    }),
    Object.freeze({ id: "resources", label: "Resources", path: "resources/" }),
    Object.freeze({ id: "help", label: "Help", path: "help/" })
  ]),
  courseSectionIds: Object.freeze([
    "home",
    "course-guide",
    "foundations",
    "projects",
    "task-1",
    "task-2",
    "task-3",
    "assessment-practice"
  ]),
  features: Object.freeze({
    authentication: true,
    codingExercises: true,
    onboarding: true,
    progress: true
  }),
  theme: Object.freeze({
    primary: "#006477",
    accent: "#00839a"
  })
});

export type AppConfig = typeof APP_CONFIG;
export type NavigationItem = (typeof APP_CONFIG.navigation)[number];
