import { describe, expect, it } from "vitest";
import {
  isStudentNumberAlreadyLinked,
  joinClassFailureMessage,
  shouldCompleteProfileBeforeJoin
} from "./join-class-errors";

describe("join class failure mapping", () => {
  it("maps PostgREST Student ID conflicts instead of the generic platform message", () => {
    const failure = {
      code: "23505",
      learnerMessage: "The learner service could not complete that request. Try again shortly.",
      cause: { code: "23505", message: "STUDENT_NUMBER_ALREADY_LINKED" }
    };
    expect(joinClassFailureMessage(failure)).toMatch(/already linked to another learning account/i);
    expect(isStudentNumberAlreadyLinked(failure)).toBe(true);
  });

  it("maps onboarding profile conflicts", () => {
    expect(joinClassFailureMessage({
      code: "23000",
      cause: { message: "ONBOARDING_CONFLICT" }
    })).toMatch(/does not match that learner profile/i);
    expect(isStudentNumberAlreadyLinked({
      cause: { message: "ONBOARDING_CONFLICT" }
    })).toBe(false);
  });

  it("keeps joinClass learner messages for invalid class keys", () => {
    expect(joinClassFailureMessage({
      learnerMessage: "Could not join your class. Check the registration key and try again."
    })).toMatch(/Check the registration key/i);
  });

  it("only completes profile while Core still requires onboarding", () => {
    expect(shouldCompleteProfileBeforeJoin("onboarding-required")).toBe(true);
    expect(shouldCompleteProfileBeforeJoin("no-enrolment")).toBe(false);
    expect(shouldCompleteProfileBeforeJoin("ready")).toBe(false);
  });
});
