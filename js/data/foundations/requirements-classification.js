(function () {
  "use strict";
  if (typeof globalThis !== "undefined" && globalThis.__lpPublishedCurriculum) {
    return;
  }

  var classificationOptions = [
    { value: "functional", label: "Functional" },
    { value: "non-functional", label: "Non-functional" }
  ];
  var testabilityOptions = [
    { value: "testable", label: "Testable as written" },
    { value: "vague", label: "Too vague to test reliably" }
  ];

  function feedback(explanation) {
    return { correct: explanation, incorrect: explanation };
  }

  function classify(id, prompt, answer, explanation) {
    return {
      id: id,
      type: "single",
      prompt: prompt,
      options: classificationOptions,
      answer: answer,
      feedback: feedback(explanation)
    };
  }

  function testable(id, prompt, answer, explanation) {
    return {
      id: id,
      type: "single",
      prompt: prompt,
      options: testabilityOptions,
      answer: answer,
      feedback: feedback(explanation)
    };
  }

  window.FoundationActivityData = {
    id: "foundations-requirements-classification",
    version: "1.0.0",
    title: "Requirements Classification",
    resultIntro: "Use the result to review how actions, qualities and measurable constraints are expressed in requirements.",
    sections: [
      {
        id: "classification",
        title: "Classify the requirements",
        intro: "Northbridge College wants an equipment-loan service for cameras, laptops and audio kits. A functional requirement describes what the solution must do. A non-functional requirement describes a quality, constraint or condition for how it operates.",
        questions: [
          classify(
            "FOUND-REQ-001",
            "Students can search available equipment by name, category or collection date.",
            "functional",
            "This describes actions the solution must perform: searching records using three criteria."
          ),
          classify(
            "FOUND-REQ-002",
            "Search results must appear within two seconds for at least 95% of searches during college opening hours.",
            "non-functional",
            "The response-time target is a measurable performance quality rather than a user action."
          ),
          classify(
            "FOUND-REQ-003",
            "A student can reserve one available item for a selected collection slot.",
            "functional",
            "Reserving an item and selecting a slot are behaviours the solution must provide."
          ),
          classify(
            "FOUND-REQ-004",
            "The service must support the current and previous major versions of Chrome, Firefox, Safari and Edge.",
            "non-functional",
            "Supported browsers are a compatibility constraint on how the service must operate."
          ),
          classify(
            "FOUND-REQ-005",
            "Technicians can mark an item as unavailable and record the reason.",
            "functional",
            "Updating an item's status and storing a reason are system functions."
          ),
          classify(
            "FOUND-REQ-006",
            "The service must remain usable when the page is enlarged to 200% without loss of content or controls.",
            "non-functional",
            "This sets a measurable accessibility and usability quality for the interface."
          ),
          classify(
            "FOUND-REQ-007",
            "When a reservation is confirmed, the service stores the student ID, item ID, collection slot and reservation time.",
            "functional",
            "The requirement specifies data the solution must store when an event occurs."
          ),
          classify(
            "FOUND-REQ-008",
            "Only authorised technicians can view the equipment maintenance notes.",
            "non-functional",
            "This is an access-control and security constraint on who may see sensitive operational information."
          ),
          classify(
            "FOUND-REQ-009",
            "A student can cancel a reservation until 30 minutes before its collection slot.",
            "functional",
            "Cancellation is a user action. The time rule constrains that function but the main requirement still describes behaviour."
          ),
          classify(
            "FOUND-REQ-010",
            "The service must be available from 07:00 to 20:00 on teaching days, excluding published maintenance periods.",
            "non-functional",
            "This sets a measurable availability condition rather than describing a transaction."
          ),
          classify(
            "FOUND-REQ-011",
            "The service shows a clear reason when a reservation cannot be completed.",
            "functional",
            "Displaying an explanatory result after a failed action is behaviour the solution must perform."
          ),
          classify(
            "FOUND-REQ-012",
            "Reservation data must be encrypted while travelling between the browser and the service.",
            "non-functional",
            "Encryption in transit is a security condition on how data is handled."
          ),
          classify(
            "FOUND-REQ-013",
            "Technicians can produce a list of overdue items grouped by equipment category.",
            "functional",
            "Generating and grouping an overdue-items list is an output the solution must provide."
          ),
          classify(
            "FOUND-REQ-014",
            "A first-time student should be able to reserve an available item in no more than five minutes without staff help.",
            "non-functional",
            "This expresses a measurable usability target for completing the reservation process."
          )
        ]
      },
      {
        id: "testability",
        title: "Requirement quality challenge",
        intro: "A useful requirement gives a tester enough information to decide whether the solution meets it. Decide whether each requirement is testable as written.",
        questions: [
          testable(
            "FOUND-REQ-TEST-001",
            "The equipment search should load quickly.",
            "vague",
            "Quickly has no shared measurement. A response-time threshold and a defined test condition would make it testable."
          ),
          testable(
            "FOUND-REQ-TEST-002",
            "Search results must be displayed within two seconds when the catalogue contains up to 10,000 items.",
            "testable",
            "The two-second limit and catalogue size give a tester a measurable expected result and condition."
          ),
          testable(
            "FOUND-REQ-TEST-003",
            "The system should be easy for students to use.",
            "vague",
            "Easy is subjective without a defined user group, task and success measure."
          ),
          testable(
            "FOUND-REQ-TEST-004",
            "At least 8 of 10 first-time student testers must complete a reservation within five minutes without staff help.",
            "testable",
            "The user group, task, time limit, sample size and success threshold can all be observed."
          ),
          testable(
            "FOUND-REQ-TEST-005",
            "The service must work well in modern browsers.",
            "vague",
            "Work well and modern browsers are undefined, so different testers could reach different conclusions."
          ),
          testable(
            "FOUND-REQ-TEST-006",
            "All reservation controls must work in the current versions of Chrome, Firefox, Safari and Edge using keyboard input only.",
            "testable",
            "The browsers, controls and input method are specified, allowing repeatable compatibility and keyboard tests."
          )
        ]
      }
    ]
  };
})();
