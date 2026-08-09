(function () {
  "use strict";

  window.APP_CONFIG = Object.freeze({
    siteName: "T Level Digital Software Development Hub",
    shortName: "Software Development Hub",
    backend: "supabase",
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
    learnerContext: Object.freeze({
      status: "supabase-authenticated",
      fields: Object.freeze([
        "Student number",
        "First Name",
        "Display Name",
        "Class Group",
        "Auth session"
      ])
    }),
    futureApiDomains: Object.freeze({
      learning: Object.freeze([
        "activities",
        "diagnostics",
        "submissions",
        "progress"
      ]),
      projectEvidence: Object.freeze([
        "requirements",
        "source logs",
        "AI logs",
        "evidence",
        "project records"
      ])
    })
  });
})();
