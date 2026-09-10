export const APP_CONFIG = Object.freeze({
  hubId: "tlevel-software-development",
  courseKey: "t-level-digital-software-development",
  hubVersion: "0.1.0",
  siteName: "T Level Digital Software Development Hub",
  shortName: "Software Development Hub",
  qualification: "T Level Digital",
  coreVersion: "0.2.18",
  learnerApiContractVersion: "0.1.0",
  submissionContractVersion: "0.1.0",
  currentPhase: "Week 1: Client Brief, Context and Initial Research",
  navigation: Object.freeze([
    Object.freeze({ id: "home", label: "Home", path: "" }),
    Object.freeze({ id: "foundations", label: "Foundations", path: "foundations/" }),
    Object.freeze({ id: "course-guide", label: "Course Guide", path: "course-guide/" }),
    Object.freeze({ id: "projects", label: "Projects", path: "projects/" }),
    Object.freeze({
      id: "assessment-practice",
      label: "Assessment Practice",
      path: "assessment-practice/"
    }),
    Object.freeze({ id: "resources", label: "Resources", path: "resources/" }),
    Object.freeze({ id: "help", label: "Help", path: "help/" }),
    Object.freeze({ id: "account", label: "Account", path: "account/" })
  ]),
  courseSectionIds: Object.freeze([
    "home",
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
  }),
  curriculumPackage: "content/tlevel-software-development"
});

export type AppConfig = typeof APP_CONFIG;
export type NavigationItem = (typeof APP_CONFIG.navigation)[number];
