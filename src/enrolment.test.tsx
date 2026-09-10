/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JoinClassPanel } from "./components/JoinClassPanel";
import {
  EXPECTED_GROUP_CODE,
  EXPECTED_REGISTRATION_KEY,
  JOIN_CLASS_MESSAGE,
  JOIN_CLASS_PROMPT,
  SIGN_IN_TO_CONTINUE,
  canMarkActivity,
  isTLevelRegistrationOption,
  markBlockedError,
  needsJoinClass,
  withEnrolmentGuardedMarking
} from "./enrolment";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("T Level normal learner enrolment", () => {
  it("guest join panel asks the learner to sign in", () => {
    render(
      <JoinClassPanel
        platformState="signed-out"
        platform={{}}
        onSignIn={vi.fn()}
      />
    );
    expect(screen.getByText(SIGN_IN_TO_CONTINUE)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open Account" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open Account" })).toBeNull();
  });

  it("guest Open Account opens the Core account flow instead of a second signup page", () => {
    const onSignIn = vi.fn();
    render(
      <JoinClassPanel
        platformState="signed-out"
        platform={{}}
        onSignIn={onSignIn}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Open Account" }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it("guest requires sign-in before marking", () => {
    expect(needsJoinClass("signed-out")).toBe(false);
    expect(canMarkActivity("signed-out")).toBe(false);
    const error = markBlockedError("signed-out") as Error & { code?: string; learnerMessage?: string };
    expect(error?.code).toBe("AUTH_REQUIRED");
    expect(error?.learnerMessage).toBe(SIGN_IN_TO_CONTINUE);
  });

  it("authenticated learner with no group sees join-class prompt state", () => {
    expect(needsJoinClass("onboarding-required")).toBe(true);
    expect(needsJoinClass("no-enrolment")).toBe(true);
    expect(canMarkActivity("onboarding-required")).toBe(false);
    const error = markBlockedError("no-enrolment") as Error & { code?: string; learnerMessage?: string };
    expect(error?.code).toBe("JOIN_CLASS_REQUIRED");
    expect(error?.learnerMessage).toBe(JOIN_CLASS_MESSAGE);
  });

  it("enrolled T Level learner does not see join prompt and can mark", () => {
    const enrolments = [{ status: "active", groupCode: EXPECTED_GROUP_CODE }];
    expect(needsJoinClass("ready", { enrolments })).toBe(false);
    expect(canMarkActivity("ready", { enrolments })).toBe(true);
    expect(markBlockedError("ready", { enrolments })).toBeNull();
  });

  it("inactive T Level enrolment cannot bypass JoinClass", () => {
    const enrolments = [{ status: "withdrawn", groupCode: EXPECTED_GROUP_CODE }];
    expect(needsJoinClass("no-enrolment", { enrolments })).toBe(true);
    expect(canMarkActivity("no-enrolment", { enrolments })).toBe(false);
    expect(needsJoinClass("ready", { enrolments })).toBe(true);
    expect(canMarkActivity("ready", { enrolments })).toBe(false);
    const error = markBlockedError("no-enrolment", { enrolments }) as Error & { code?: string };
    expect(error?.code).toBe("JOIN_CLASS_REQUIRED");
  });

  it("Cyber-only ready state does not count as T Level access", () => {
    const enrolments = [{ status: "active", groupCode: "CYBER-TEST-A" }];
    expect(needsJoinClass("ready", { enrolments })).toBe(true);
    expect(canMarkActivity("ready", { enrolments })).toBe(false);
    const error = markBlockedError("ready", { enrolments }) as Error & { code?: string };
    expect(error?.code).toBe("JOIN_CLASS_REQUIRED");
  });

  it("L2E-only ready state does not count as T Level access", () => {
    const enrolments = [{ status: "active", groupCode: "L2E-DELIVERY-A" }];
    expect(canMarkActivity("ready", { enrolments })).toBe(false);
    expect(needsJoinClass("ready", { enrolments })).toBe(true);
  });

  it("does not call mark_formative_response before valid enrolment", async () => {
    const markBlock = vi.fn(async (_input?: Record<string, unknown>) => ({ complete: true }));
    const platform = withEnrolmentGuardedMarking(
      {
        marking: { markBlock },
        learner: { getState: () => ({ context: { enrolments: [] } }) }
      },
      () => "onboarding-required"
    );
    await expect(platform.marking.markBlock({ activityKey: "foundations-requirements-classification" })).rejects.toMatchObject({
      code: "JOIN_CLASS_REQUIRED",
      learnerMessage: JOIN_CLASS_MESSAGE
    });
    expect(markBlock).not.toHaveBeenCalled();
  });

  it("blocks mark when platform is ready but only other-course enrolments exist", async () => {
    const markBlock = vi.fn(async (_input?: Record<string, unknown>) => ({ complete: true }));
    const platform = withEnrolmentGuardedMarking(
      {
        marking: { markBlock },
        learner: {
          getState: () => ({
            context: { enrolments: [{ status: "active", groupCode: "CYBER-TEST-A" }] }
          })
        }
      },
      () => "ready"
    );
    await expect(platform.marking.markBlock({ activityKey: "foundations-requirements-classification" })).rejects.toMatchObject({
      code: "JOIN_CLASS_REQUIRED"
    });
    expect(markBlock).not.toHaveBeenCalled();
  });

  it("enrolled learner can immediately mark through the guarded platform", async () => {
    const markBlock = vi.fn(async (_input?: Record<string, unknown>) => ({ complete: true, correct: true }));
    const platform = withEnrolmentGuardedMarking(
      {
        marking: { markBlock },
        learner: {
          getState: () => ({
            context: { enrolments: [{ status: "active", groupCode: EXPECTED_GROUP_CODE }] }
          })
        }
      },
      () => "ready"
    );
    await expect(platform.marking.markBlock({ activityKey: "foundations-requirements-classification" })).resolves.toMatchObject({
      complete: true
    });
    expect(markBlock).toHaveBeenCalledTimes(1);
  });

  it("correct class key joins through onboarding.joinClass without a group picker", async () => {
    const complete = vi.fn(async () => ({ student_number: "STU-1" }));
    const joinClass = vi.fn(async () => ({ groupCode: EXPECTED_GROUP_CODE, status: "enrolled_created" }));
    const onJoined = vi.fn();
    const platform = {
      onboarding: {
        getPending: () => ({
          firstName: "Normal",
          surname: "Learner",
          studentNumber: "STU-1"
        }),
        complete,
        joinClass
      },
      learner: {
        getState: () => ({ status: "onboarding-required", context: null }),
        refresh: vi.fn(async () => undefined)
      }
    };

    render(
      <JoinClassPanel
        platformState="onboarding-required"
        platform={platform}
        onJoined={onJoined}
      />
    );

    expect(screen.getByText(JOIN_CLASS_PROMPT)).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();

    fireEvent.change(screen.getByLabelText(/Class registration key/i), {
      target: { value: EXPECTED_REGISTRATION_KEY }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Join class" }));
    });

    await waitFor(() => {
      expect(joinClass).toHaveBeenCalledTimes(1);
    });
    expect(complete).toHaveBeenCalledWith({
      firstName: "Normal",
      surname: "Learner",
      studentNumber: "STU-1"
    });
    expect(joinClass).toHaveBeenCalledWith(EXPECTED_REGISTRATION_KEY);
    expect(onJoined).toHaveBeenCalledTimes(1);
  });

  it("existing unenrolled account can join without recreating the account", async () => {
    const complete = vi.fn(async () => ({ student_number: "STU-OLD" }));
    const joinClass = vi.fn(async () => ({ groupCode: EXPECTED_GROUP_CODE, status: "enrolled" }));
    const platform = {
      onboarding: {
        getPending: () => null,
        complete,
        joinClass
      },
      learner: {
        getState: () => ({
          status: "authenticated",
          context: {
            firstName: "Existing",
            surname: "Student",
            studentNumber: "STU-OLD",
            enrolments: [{ status: "active", groupCode: "CYBER-TEST-A" }]
          }
        })
      }
    };

    render(
      <JoinClassPanel
        platformState="ready"
        platform={platform}
      />
    );

    expect(screen.queryByRole("combobox")).toBeNull();
    fireEvent.change(screen.getByLabelText(/Class registration key/i), {
      target: { value: EXPECTED_REGISTRATION_KEY }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Join class" }));
    });
    await waitFor(() => expect(joinClass).toHaveBeenCalledTimes(1));
    expect(complete).not.toHaveBeenCalled();
    expect(joinClass).toHaveBeenCalledWith(EXPECTED_REGISTRATION_KEY);
  });

  it("wrong class key is denied and does not invent a second Auth identity", async () => {
    const complete = vi.fn(async () => ({ student_number: "STU-1" }));
    const joinClass = vi.fn(async () => {
      throw Object.assign(new Error("denied"), {
        learnerMessage: "Could not join your class. Check the registration key and try again."
      });
    });
    const platform = {
      onboarding: {
        getPending: () => ({
          firstName: "Normal",
          surname: "Learner",
          studentNumber: "STU-1"
        }),
        complete,
        joinClass
      },
      learner: {
        getState: () => ({ status: "onboarding-required", context: null })
      }
    };

    render(
      <JoinClassPanel
        platformState="onboarding-required"
        platform={platform}
      />
    );

    fireEvent.change(screen.getByLabelText(/Class registration key/i), {
      target: { value: "not-the-class-key" }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Join class" }));
    });
    await waitFor(() => expect(joinClass).toHaveBeenCalledWith("not-the-class-key"));
    expect(screen.getByText(/Could not join your class/i)).toBeTruthy();
    expect(screen.queryByLabelText(/College email address/i)).toBeNull();
    expect(screen.queryByLabelText(/^Password$/i)).toBeNull();
  });

  it("surfaces Student ID already-linked instead of the generic platform message", async () => {
    const complete = vi.fn(async () => {
      throw Object.assign(new Error("conflict"), {
        code: "23505",
        learnerMessage: "The learner service could not complete that request. Try again shortly.",
        cause: { code: "23505", message: "STUDENT_NUMBER_ALREADY_LINKED" }
      });
    });
    const joinClass = vi.fn(async () => ({ groupCode: EXPECTED_GROUP_CODE, status: "enrolled" }));
    const platform = {
      onboarding: {
        getPending: () => ({
          firstName: "Other",
          surname: "Learner",
          studentNumber: "123456"
        }),
        complete,
        joinClass
      },
      learner: {
        getState: () => ({ status: "onboarding-required", context: null })
      }
    };

    render(
      <JoinClassPanel
        platformState="onboarding-required"
        platform={platform}
      />
    );

    fireEvent.change(screen.getByLabelText(/Class registration key/i), {
      target: { value: EXPECTED_REGISTRATION_KEY }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Join class" }));
    });

    await waitFor(() => {
      expect(screen.getByText(/already linked to another learning account/i)).toBeTruthy();
    });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(joinClass).not.toHaveBeenCalled();
  });

  it("shows Switch account after Student ID already-linked when a switch handler is provided", async () => {
    const onSwitchAccount = vi.fn();
    const complete = vi.fn(async () => {
      throw Object.assign(new Error("conflict"), {
        cause: { message: "STUDENT_NUMBER_ALREADY_LINKED" }
      });
    });
    render(
      <JoinClassPanel
        platformState="onboarding-required"
        platform={{
          onboarding: {
            getPending: () => ({
              firstName: "Other",
              surname: "Learner",
              studentNumber: "123456"
            }),
            complete,
            joinClass: vi.fn()
          },
          learner: {
            getState: () => ({ status: "onboarding-required", context: null })
          }
        }}
        onSignIn={vi.fn()}
        onSwitchAccount={onSwitchAccount}
      />
    );

    fireEvent.change(screen.getByLabelText(/Class registration key/i), {
      target: { value: EXPECTED_REGISTRATION_KEY }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Join class" }));
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Switch account" })).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: "Account" })).toBeNull();
  });

  it("enrolled learner sees joined status instead of join prompt", () => {
    render(
      <JoinClassPanel
        platformState="ready"
        platform={{
          learner: {
            getState: () => ({
              status: "authenticated",
              context: {
                yearGroup: "Year 2",
                groupName: "T Level Year 2",
                groupCode: EXPECTED_GROUP_CODE,
                enrolments: [{
                  status: "active",
                  groupCode: EXPECTED_GROUP_CODE,
                  groupName: "T Level Year 2",
                  yearGroup: "Year 2"
                }]
              }
            })
          }
        }}
      />
    );
    expect(screen.getByText(/You are joined to/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Join class" })).toBeNull();
  });

  it("recognises the T Level registration option by key or group code", () => {
    expect(isTLevelRegistrationOption({
      registrationKey: EXPECTED_REGISTRATION_KEY,
      groupCode: EXPECTED_GROUP_CODE
    })).toBe(true);
    expect(isTLevelRegistrationOption({
      registrationKey: "cyber-year-1-test",
      groupCode: "CYBER-TEST-A"
    })).toBe(false);
  });
});
