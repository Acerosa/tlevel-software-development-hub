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
    currentPhase: "Week 1: Introduction to New and Emerging Digital Technologies",
    navigation: Object.freeze([
      { id: "home", label: "Home", path: "" },
      { id: "week-1", label: "Week 1", path: "week-1/" },
      { id: "week-2", label: "Week 2", path: "week-2/" },
      { id: "week-3", label: "Week 3", path: "week-3/" },
      { id: "foundations", label: "Foundations", path: "foundations/" },
      { id: "course-guide", label: "Course Guide", path: "course-guide/" },
      { id: "projects", label: "Projects", path: "projects/" },
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
