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
  currentPhase: "Week 1: Introduction to New and Emerging Digital Technologies",
  navigation: Object.freeze([
    Object.freeze({ id: "home", label: "Home", path: "" }),
    Object.freeze({ id: "week-1", label: "Week 1", path: "week-1/" }),
    Object.freeze({ id: "week-2", label: "Week 2", path: "week-2/" }),
    Object.freeze({ id: "week-3", label: "Week 3", path: "week-3/" }),
    Object.freeze({ id: "foundations", label: "Foundations", path: "foundations/" }),
    Object.freeze({ id: "course-guide", label: "Course Guide", path: "course-guide/" }),
    Object.freeze({ id: "projects", label: "Projects", path: "projects/" }),
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
    "week-1",
    "week-2",
    "week-3",
    "foundations",
    "course-guide",
    "projects",
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
