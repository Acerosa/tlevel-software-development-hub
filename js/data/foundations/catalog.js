(function () {
  "use strict";

  window.FoundationActivityCatalog = Object.freeze([
    {
      id: "foundations-programming-diagnostic",
      version: "1.0.0",
      title: "Programming Diagnostic",
      purpose: "Check what you remember about core programming and introductory database concepts.",
      type: "Diagnostic",
      detail: "Seven sections with code reading, tracing, matching and short answer tasks.",
      topics: ["Variables", "Selection", "Iteration", "Functions", "Arrays/lists", "Debugging", "Basic SQL"],
      path: "./programming-diagnostic/"
    },
    {
      id: "foundations-requirements-classification",
      version: "1.0.0",
      title: "Requirements Classification",
      purpose: "Distinguish what a solution must do from the qualities and constraints it must meet.",
      type: "Classification activity",
      detail: "Classify realistic requirements, then decide whether requirements are testable.",
      topics: ["Functional requirements", "Non-functional requirements", "Measurable acceptance criteria"],
      path: "./requirements-classification/"
    },
    {
      id: "foundations-problem-decomposition",
      version: "1.0.0",
      title: "Problem Decomposition",
      purpose: "Break a complex client problem into manageable technical problems and implementation tasks.",
      type: "Multi-stage scenario",
      detail: "Work through sub-problems, hierarchy, decomposition quality and requirement mapping.",
      topics: ["Sub-problems", "Problem hierarchy", "Implementation tasks", "Requirement mapping"],
      path: "./problem-decomposition/"
    },
    {
      id: "foundations-data-design",
      version: "1.0.0",
      title: "Data Design Knowledge Check",
      purpose: "Check the building blocks used to describe data, relationships and validation rules.",
      type: "Knowledge check",
      detail: "Use a college clubs dataset to reason about types, keys, relationships and a data dictionary.",
      topics: ["Fields and records", "Data types", "Keys and relationships", "Validation", "Data dictionaries"],
      path: "./data-design/"
    },
    {
      id: "foundations-testing-methods",
      version: "1.0.0",
      title: "Testing Methods Classification",
      purpose: "Choose suitable testing methods and connect each method to its purpose and evidence.",
      type: "Classification activity",
      detail: "Classify testing scenarios, build a useful test case and follow an iteration cycle.",
      topics: ["Testing levels", "Black-box testing", "Compatibility", "Test cases", "Retesting"],
      path: "./testing-methods/"
    }
  ]);
})();
