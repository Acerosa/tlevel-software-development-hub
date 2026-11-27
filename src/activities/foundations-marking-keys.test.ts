import { describe, expect, it } from "vitest";
import { foundationsActivityHasMarkingKeys } from "./foundations-marking-keys";

describe("foundationsActivityHasMarkingKeys", () => {
  it("returns false for learner-stripped single-choice blocks", () => {
    expect(
      foundationsActivityHasMarkingKeys({
        sections: [
          {
            questions: [
              {
                id: "FOUND-REQ-001",
                type: "single",
                correctOptionId: "",
                options: [{ id: "functional", label: "Functional" }]
              }
            ]
          }
        ]
      })
    ).toBe(false);
  });

  it("returns true when authoritative answer keys are present", () => {
    expect(
      foundationsActivityHasMarkingKeys({
        sections: [
          {
            questions: [
              {
                id: "FOUND-PROG-VAR-001",
                type: "single",
                answer: "store"
              },
              {
                id: "FOUND-PROG-VAR-002",
                type: "predict-output",
                languages: { python: { answers: ["11"] } }
              }
            ]
          }
        ]
      })
    ).toBe(true);
  });
});
