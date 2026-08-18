(function () {
  "use strict";
  if (typeof globalThis !== "undefined" && globalThis.__lpPublishedCurriculum) {
    return;
  }

  function options(items) {
    return items.map(function (item) { return { value: item[0], label: item[1] }; });
  }

  function feedback(explanation) {
    return { correct: explanation, incorrect: explanation };
  }

  function single(id, prompt, items, answer, explanation) {
    return { id: id, type: "single", prompt: prompt, options: options(items), answer: answer, feedback: feedback(explanation) };
  }

  var coreMethods = [
    ["unit", "Unit testing"],
    ["integration", "Integration testing"],
    ["system", "System testing"],
    ["uat", "User acceptance testing"],
    ["black-box", "Black-box/functionality testing"],
    ["compatibility", "Compatibility testing"],
    ["automated", "Automated testing"],
    ["manual", "Manual testing"],
    ["performance", "Performance testing"],
    ["load", "Load testing"],
    ["stress", "Stress testing"]
  ];

  function scenario(id, prompt, answer, explanation) {
    return single(id, prompt, coreMethods, answer, explanation);
  }

  window.FoundationActivityData = {
    id: "foundations-testing-methods",
    version: "1.0.0",
    title: "Testing Methods Classification",
    resultIntro: "Use this summary to review when each testing method is useful and what a test record should communicate.",
    sections: [
      {
        id: "scenarios",
        title: "Classify testing scenarios",
        intro: "Choose the most appropriate method for each scenario. Testing labels can overlap: a unit test may be automated, while black-box describes testing behaviour without relying on internal code knowledge.",
        questions: [
          scenario(
            "FOUND-TEST-001",
            "A developer checks one function that calculates a booking total in isolation.",
            "unit",
            "Unit testing focuses on one small component, such as a function, without depending on the complete application."
          ),
          scenario(
            "FOUND-TEST-002",
            "The connection between the booking service and the database repository is tested.",
            "integration",
            "Integration testing checks whether two or more components exchange data and work together correctly."
          ),
          scenario(
            "FOUND-TEST-003",
            "The complete deployed application is tested from login through booking and confirmation.",
            "system",
            "System testing evaluates the complete integrated solution against its requirements."
          ),
          scenario(
            "FOUND-TEST-004",
            "The client checks whether the finished booking process satisfies the agreed acceptance criteria.",
            "uat",
            "User acceptance testing asks whether the solution is acceptable for the client's real needs and agreed criteria."
          ),
          scenario(
            "FOUND-TEST-005",
            "A tester enters valid and invalid login details and checks the outputs without looking at source code.",
            "black-box",
            "Black-box or functionality testing checks observable behaviour from inputs and outputs without using internal implementation knowledge."
          ),
          scenario(
            "FOUND-TEST-006",
            "The completed interface is checked on Chrome, Firefox, Safari and Edge.",
            "compatibility",
            "Compatibility testing checks that the solution operates across the specified browsers or platforms."
          ),
          scenario(
            "FOUND-TEST-007",
            "A test runner executes the same 200 calculation checks after every code change.",
            "automated",
            "Automated testing uses software to run repeatable checks and compare actual outcomes with expected outcomes."
          ),
          scenario(
            "FOUND-TEST-008",
            "A tester follows written steps to judge whether keyboard focus moves in a sensible order.",
            "manual",
            "Manual testing is appropriate where a person follows steps and observes usability or behaviour that is not fully captured by one automated assertion."
          ),
          scenario(
            "FOUND-TEST-009",
            "The team measures how long a complex search takes with a representative catalogue.",
            "performance",
            "Performance testing measures qualities such as response time or resource use under defined conditions."
          ),
          scenario(
            "FOUND-TEST-010",
            "The service is tested with 500 simultaneous users, matching the expected busiest period.",
            "load",
            "Load testing checks behaviour under an expected volume of concurrent work."
          ),
          scenario(
            "FOUND-TEST-011",
            "Traffic is increased beyond expected capacity until the service slows or fails, then recovery is observed.",
            "stress",
            "Stress testing pushes beyond normal limits to discover breaking points and recovery behaviour."
          ),
          scenario(
            "FOUND-TEST-012",
            "All functions are combined, and the team checks whether a user can complete every specified process in the final build.",
            "system",
            "The focus is the complete application's processes, so system testing is the most appropriate primary label."
          ),
          scenario(
            "FOUND-TEST-013",
            "A client representative tries to cancel a booking and confirms that the agreed cancellation rules are satisfied.",
            "uat",
            "A representative user is evaluating the finished behaviour against an agreed business rule, which is user acceptance testing."
          )
        ]
      },
      {
        id: "purpose",
        title: "Match method, purpose and example",
        intro: "Connect testing vocabulary to its purpose rather than relying on the label alone.",
        questions: [
          {
            id: "FOUND-TEST-PURPOSE-001",
            type: "matching",
            prompt: "Match each method to its main purpose.",
            rows: [
              { id: "unit", label: "Unit testing" },
              { id: "integration", label: "Integration testing" },
              { id: "uat", label: "User acceptance testing" },
              { id: "compatibility", label: "Compatibility testing" },
              { id: "load", label: "Load testing" }
            ],
            options: options([["component", "Check a small component in isolation"], ["connections", "Check components work together"], ["client", "Check agreed user or client needs are met"], ["platforms", "Check specified browsers or platforms"], ["volume", "Check expected levels of concurrent work"]]),
            answer: { unit: "component", integration: "connections", uat: "client", compatibility: "platforms", load: "volume" },
            feedback: feedback("Each method is defined by the level, relationship or quality it investigates."
            )
          },
          single(
            "FOUND-TEST-PURPOSE-002",
            "Which statement correctly explains why automated and unit testing are not opposites?",
            [["overlap", "Unit describes the scope, while automated describes how a check is executed"], ["same", "They are exactly the same term"], ["manual", "Unit tests must always be manual"], ["system", "Automated tests can only test complete systems"]],
            "overlap",
            "Testing categories can overlap. A unit test can be automated or manual because scope and execution approach describe different aspects."
          ),
          single(
            "FOUND-TEST-PURPOSE-003",
            "Which statement correctly explains black-box testing?",
            [["behaviour", "It focuses on observable inputs and outputs without relying on internal code knowledge"], ["colour", "It only tests dark interface themes"], ["unit", "It always means one function"], ["manual", "It can never be automated"]],
            "behaviour",
            "Black-box describes a perspective on behaviour. It can be used at different levels and may be manual or automated."
          )
        ]
      },
      {
        id: "test-cases",
        title: "Useful test cases",
        intro: "A useful test case records enough information for another person to repeat the check and understand the outcome.",
        questions: [
          {
            id: "FOUND-TEST-CASE-001",
            type: "multiple",
            prompt: "Which six items belong in a useful test case record?",
            options: options([["id", "Test ID"], ["requirement", "Requirement or feature"], ["input", "Input/test data"], ["expected", "Expected result"], ["actual", "Actual result"], ["status", "Pass/fail and notes"], ["favourite", "Tester's favourite colour"], ["secret", "A real user's password"]]),
            answer: ["id", "requirement", "input", "expected", "actual", "status"],
            feedback: feedback("The selected fields provide traceability, repeatable data, a comparison between expected and actual outcomes, and a recorded status. Real credentials must not be used."
            )
          },
          single(
            "FOUND-TEST-CASE-002",
            "Why should the expected result be written before or independently of the actual result?",
            [["objective", "It defines the intended behaviour so the observed outcome can be judged objectively"], ["copy", "It lets the tester copy the actual result"], ["hide", "It hides the requirement"], ["pass", "It guarantees the test passes"]],
            "objective",
            "The expected result provides a clear basis for comparison rather than being adjusted to match what the software happened to do."
          ),
          single(
            "FOUND-TEST-CASE-003",
            "Which test data best checks an inclusive allowed age range of 16 to 25?",
            [["boundaries", "15, 16, 25 and 26"], ["middle", "20 only"], ["valid", "16 only"], ["text", "sixteen only"]],
            "boundaries",
            "The values immediately below, at and immediately above the boundaries expose incorrect comparison operators and range handling."
          )
        ]
      },
      {
        id: "iteration",
        title: "Testing and iteration",
        intro: "Testing becomes valuable development evidence when its findings lead to a change and the change is checked again.",
        questions: [
          {
            id: "FOUND-TEST-ITER-001",
            type: "order",
            prompt: "Order the testing and improvement cycle.",
            items: [
              { id: "test", label: "Run the planned test" },
              { id: "identify", label: "Record the problem identified" },
              { id: "change", label: "Make a focused change" },
              { id: "retest", label: "Repeat the failed test and relevant regression tests" }
            ],
            answer: ["test", "identify", "change", "retest"],
            feedback: feedback("The cycle starts with evidence, records the problem, makes a controlled change and then verifies the change through retesting."
            )
          },
          single(
            "FOUND-TEST-ITER-002",
            "Why does a corrected defect need retesting?",
            [["verify", "To verify the change fixes the defect and has not broken related behaviour"], ["erase", "To erase the original test record"], ["grade", "To guarantee a qualification grade"], ["avoid", "To avoid comparing expected and actual results"]],
            "verify",
            "Retesting provides evidence that the intended fix works. Relevant regression checks look for unintended effects elsewhere."
          ),
          single(
            "FOUND-TEST-ITER-003",
            "A validation test fails because an age of 15 is accepted. Which next action is most useful?",
            [["investigate", "Record the actual result, inspect the range condition, correct it and rerun boundary tests"], ["pass", "Mark the test as passed after changing the expected result"], ["delete", "Delete the failed test"], ["rewrite", "Replace the whole application without investigating"]],
            "investigate",
            "A controlled response preserves the evidence, targets the likely boundary fault and uses the original plus related tests to verify the change."
          )
        ]
      }
    ]
  };
})();
