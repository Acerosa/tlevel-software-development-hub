(function () {
  "use strict";

  window.APP_CONFIG = Object.freeze({
    hubId: "tlevel-software-development",
    courseKey: "t-level-digital-software-development",
    hubVersion: "0.1.0",
    siteName: "T Level Digital Software Development Hub",
    shortName: "Software Development Hub",
    coreVersion: "0.2.0",
    learnerApiContractVersion: "0.1.0",
    submissionContractVersion: "0.1.0",
    currentPhase: "Phase 1: Technical Foundations",
    navigation: Object.freeze([
      { id: "home", label: "Home", path: "" },
      { id: "course-guide", label: "Course Guide", path: "course-guide/" },
      { id: "foundations", label: "Foundations", path: "foundations/" },
      { id: "projects", label: "Projects", path: "projects/" },
      { id: "task-1", label: "Task 1", path: "task-1/" },
      { id: "task-2", label: "Task 2", path: "task-2/" },
      { id: "task-3", label: "Task 3", path: "task-3/" },
      {
        id: "assessment-practice",
        label: "Assessment Practice",
        path: "assessment-practice/"
      },
      { id: "resources", label: "Resources", path: "resources/" },
      { id: "help", label: "Help", path: "help/" }
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
})();
