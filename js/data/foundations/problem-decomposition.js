(function () {
  "use strict";

  function options(items) {
    return items.map(function (item) { return { value: item[0], label: item[1] }; });
  }

  function feedback(explanation) {
    return { correct: explanation, incorrect: explanation };
  }

  function single(id, prompt, items, answer, explanation) {
    return { id: id, type: "single", prompt: prompt, options: options(items), answer: answer, feedback: feedback(explanation) };
  }

  function multiple(id, prompt, items, answer, explanation) {
    return { id: id, type: "multiple", prompt: prompt, options: options(items), answer: answer, feedback: feedback(explanation) };
  }

  window.FoundationActivityData = {
    id: "foundations-problem-decomposition",
    version: "1.0.0",
    title: "Problem Decomposition",
    resultIntro: "This result shows how well you connected client needs to manageable technical problems and implementation tasks.",
    sections: [
      {
        id: "major-problems",
        title: "Identify major problems",
        intro: "Riverside Community Sports Centre needs a digital service where residents create accounts, browse sessions, book or cancel places, and receive confirmation. Staff manage sessions and capacity. The interface must be accessible.",
        questions: [
          multiple(
            "FOUND-DECOMP-001",
            "Which four are sensible major sub-problems for the overall service?",
            [["accounts", "User accounts"], ["bookings", "Bookings and cancellations"], ["catalogue", "Session catalogue"], ["admin", "Staff administration"], ["colour", "Make every button blue"], ["all", "Build the whole system"]],
            ["accounts", "bookings", "catalogue", "admin"],
            "Major sub-problems group related responsibilities. A colour choice is a detail, while build the whole system is too broad to guide implementation."
          ),
          single(
            "FOUND-DECOMP-002",
            "Which major problem owns checking whether a session still has a free place?",
            [["capacity", "Capacity and availability management"], ["accounts", "User account creation"], ["notification", "Confirmation messages"], ["accessibility", "Interface accessibility"]],
            "capacity",
            "Checking and updating available places belongs to capacity management, even though booking uses its result."
          ),
          single(
            "FOUND-DECOMP-003",
            "Which is a manageable sub-problem for user accounts?",
            [["validate", "Validate required registration fields"], ["build", "Build the sports centre service"], ["modern", "Make the service modern"], ["everything", "Store all possible data"]],
            "validate",
            "Validating a defined set of registration fields is specific enough to implement and test."
          ),
          multiple(
            "FOUND-DECOMP-004",
            "Which three sub-problems support an accessible booking interface?",
            [["labels", "Provide programmatic labels for controls"], ["keyboard", "Support keyboard operation"], ["errors", "Show errors using text as well as colour"], ["animation", "Animate every page transition"], ["mouse", "Require drag-and-drop for every booking"]],
            ["labels", "keyboard", "errors"],
            "Labels, keyboard operation and text-based errors create implementable accessibility work. Mandatory drag-and-drop would create a barrier."
          ),
          single(
            "FOUND-DECOMP-005",
            "Why should notification delivery be treated as a separate sub-problem from creating a booking record?",
            [["separate", "Each has a different responsibility and can fail or be tested independently"], ["same", "They must always use the same function"], ["visual", "Notifications only affect page colour"], ["database", "A booking record never uses data"]],
            "separate",
            "Recording the booking and delivering a confirmation are related but distinct responsibilities with different failure cases."
          )
        ]
      },
      {
        id: "hierarchy",
        title: "Build a problem hierarchy",
        intro: "A useful hierarchy moves from the overall client problem to a major responsibility and then to smaller technical problems.",
        questions: [
          {
            id: "FOUND-DECOMP-HIER-001",
            type: "order",
            prompt: "Order these from broadest problem to smallest technical problem.",
            items: [
              { id: "overall", label: "Provide a digital sports-centre service" },
              { id: "major", label: "Manage bookings" },
              { id: "smaller", label: "Check a session has capacity" },
              { id: "task", label: "Query the selected session's remaining_places value" }
            ],
            answer: ["overall", "major", "smaller", "task"],
            feedback: feedback("The hierarchy narrows from the overall service, through a major responsibility, to a technical problem and a concrete implementation task.")
          },
          {
            id: "FOUND-DECOMP-HIER-002",
            type: "matching",
            prompt: "Match each smaller technical problem to its major problem.",
            rows: [
              { id: "password", label: "Check a submitted password against the stored credential" },
              { id: "filter", label: "Filter sessions by activity type and day" },
              { id: "place", label: "Reduce remaining places after a successful booking" },
              { id: "cancel", label: "Restore a place after a cancellation" },
              { id: "session", label: "Allow staff to create a new session" },
              { id: "email", label: "Prepare booking confirmation details" }
            ],
            options: options([["accounts", "Accounts and authentication"], ["catalogue", "Session catalogue"], ["capacity", "Bookings and capacity"], ["admin", "Staff administration"], ["notifications", "Notifications"]]),
            answer: { password: "accounts", filter: "catalogue", place: "capacity", cancel: "capacity", session: "admin", email: "notifications" },
            feedback: feedback("Each smaller problem belongs with the major responsibility whose data and behaviour it directly supports.")
          },
          single(
            "FOUND-DECOMP-HIER-003",
            "Which child problem should sit below Send booking confirmation?",
            [["details", "Build a message containing the user, session, date and time"], ["account", "Choose how registration passwords are stored"], ["layout", "Design the staff session editor"], ["catalogue", "Sort activities by category"]],
            "details",
            "Constructing the message data is a smaller problem within the notification responsibility."
          ),
          single(
            "FOUND-DECOMP-HIER-004",
            "What is the best reason to show parent and child problems?",
            [["trace", "It shows how detailed implementation work contributes to a larger client need"], ["hide", "It hides technical decisions from developers"], ["replace", "It replaces requirements entirely"], ["grade", "It guarantees a particular assessment grade"]],
            "trace",
            "A hierarchy provides traceability from a broad need to manageable technical work without replacing the requirement itself."
          )
        ]
      },
      {
        id: "quality",
        title: "Poor versus effective decomposition",
        intro: "Effective decomposition produces problems that are clear enough to assign, implement and test.",
        questions: [
          single(
            "FOUND-DECOMP-QUALITY-001",
            "Which decomposition is more useful for implementing a booking?",
            [["effective", "Check session exists; check capacity; check eligibility; create booking; update places; return confirmation"], ["broad", "Build booking system"], ["visual", "Make booking page nice"], ["mixed", "Do database and other things"]],
            "effective",
            "The effective version names distinct problems with observable outcomes. Build booking system is still the original large problem."
          ),
          multiple(
            "FOUND-DECOMP-QUALITY-002",
            "Which three qualities make a sub-problem useful to a developer?",
            [["specific", "It has a specific responsibility"], ["testable", "Its outcome can be tested"], ["manageable", "It is small enough to implement"], ["vague", "It uses broad wording such as sort everything out"], ["overlap", "It duplicates several unrelated responsibilities"]],
            ["specific", "testable", "manageable"],
            "A useful sub-problem has a clear boundary, a checkable outcome and a manageable scope."
          ),
          single(
            "FOUND-DECOMP-QUALITY-003",
            "Why is Create all database code a weak sub-problem?",
            [["mixed", "It groups unrelated data operations and does not identify the records or behaviours needed"], ["database", "Databases cannot be decomposed"], ["short", "The wording is too short"], ["code", "Developers should not write code"]],
            "mixed",
            "The phrase hides separate responsibilities such as reading sessions, creating bookings and updating capacity."
          ),
          single(
            "FOUND-DECOMP-QUALITY-004",
            "Which revision gives Send notifications a clearer boundary?",
            [["clear", "Build confirmation data and request delivery after a successful booking"], ["all", "Send every possible message"], ["later", "Deal with notifications later"], ["system", "Make notification system"]],
            "clear",
            "The revision identifies the trigger, the required data and the hand-off to delivery."
          )
        ]
      },
      {
        id: "requirement-mapping",
        title: "Map a requirement to implementation problems",
        intro: "Requirement: A resident can book an available session, and the service must prevent the session exceeding its capacity.",
        questions: [
          multiple(
            "FOUND-DECOMP-MAP-001",
            "Which four technical problems are directly needed for this requirement?",
            [["identify", "Identify the resident and selected session"], ["capacity", "Check remaining capacity"], ["record", "Create the booking record"], ["update", "Update remaining places safely"], ["colour", "Choose the footer colour"], ["payroll", "Calculate staff payroll"]],
            ["identify", "capacity", "record", "update"],
            "The four selected problems directly support a valid booking and enforce capacity. Footer colour and payroll are outside this requirement."
          ),
          {
            id: "FOUND-DECOMP-MAP-002",
            type: "order",
            prompt: "Order the main booking checks and updates into a sensible processing sequence.",
            items: [
              { id: "find", label: "Find the requested session" },
              { id: "check", label: "Check a place is available" },
              { id: "create", label: "Create the booking record" },
              { id: "decrease", label: "Decrease remaining places" },
              { id: "confirm", label: "Return confirmation" }
            ],
            answer: ["find", "check", "create", "decrease", "confirm"],
            feedback: feedback("The service must find and validate the session before writing changes, then return confirmation after the booking succeeds.")
          },
          {
            id: "FOUND-DECOMP-MAP-003",
            type: "matching",
            prompt: "Match each technical problem to a possible implementation task.",
            rows: [
              { id: "check", label: "Check remaining capacity" },
              { id: "record", label: "Create the booking record" },
              { id: "validation", label: "Reject a duplicate booking" },
              { id: "confirm", label: "Return confirmation" }
            ],
            options: options([["read", "Read remaining_places for the session"], ["insert", "Insert resident_id and session_id into Bookings"], ["unique", "Check for an existing resident/session pair"], ["response", "Build a response with booking ID and session details"]]),
            answer: { check: "read", record: "insert", validation: "unique", confirm: "response" },
            feedback: feedback("Each implementation task is a concrete way to solve its technical problem while keeping traceability to the requirement.")
          },
          single(
            "FOUND-DECOMP-MAP-004",
            "How does this mapping help later testing?",
            [["cases", "Each technical problem suggests focused checks and expected outcomes"], ["none", "Testing no longer needs requirements"], ["automatic", "Every test becomes automated"], ["guarantee", "Defects become impossible"]],
            "cases",
            "The mapped problems reveal testable decisions such as no capacity, duplicate booking and successful confirmation."
          )
        ]
      }
    ]
  };
})();
