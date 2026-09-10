/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JoinClassPanel } from "./components/JoinClassPanel";
import { EXPECTED_REGISTRATION_KEY } from "./enrolment";
import { switchHubAccount } from "./switch-account";

describe("switchHubAccount", () => {
  it("clears pending, signs out, then opens Core Sign in", async () => {
    const order: string[] = [];
    const clearPending = vi.fn(() => { order.push("clear"); });
    const signOut = vi.fn(async () => { order.push("signOut"); });
    const openSignIn = vi.fn(() => { order.push("openSignIn"); });
    const trigger = document.createElement("button");

    await switchHubAccount({ clearPending, signOut, openSignIn, trigger });

    expect(order).toEqual(["clear", "signOut", "openSignIn"]);
    expect(openSignIn).toHaveBeenCalledWith(trigger);
  });
});

describe("JoinClass Switch account UX", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("offers Switch account only after STUDENT_NUMBER_ALREADY_LINKED", async () => {
    const onSwitchAccount = vi.fn();
    const onSignIn = vi.fn();
    const platform = {
      onboarding: {
        getPending: () => ({
          firstName: "Other",
          surname: "Learner",
          studentNumber: "123456"
        }),
        complete: vi.fn(async () => {
          throw Object.assign(new Error("conflict"), {
            cause: { message: "STUDENT_NUMBER_ALREADY_LINKED" }
          });
        }),
        joinClass: vi.fn()
      },
      learner: {
        getState: () => ({ status: "onboarding-required", context: null })
      }
    };

    render(
      <JoinClassPanel
        platformState="onboarding-required"
        platform={platform}
        onSignIn={onSignIn}
        onSwitchAccount={onSwitchAccount}
      />
    );

    expect(screen.getByRole("button", { name: "Account" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Switch account" })).toBeNull();

    fireEvent.change(screen.getByLabelText(/Class registration key/i), {
      target: { value: EXPECTED_REGISTRATION_KEY }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Join class" }));
    });

    await waitFor(() => {
      expect(screen.getByText(/already linked to another learning account/i)).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Switch account" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Account" })).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Switch account" }));
    });
    expect(onSwitchAccount).toHaveBeenCalledTimes(1);
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it("does not show Switch account for a linked learner who only needs JoinClass", async () => {
    const joinClass = vi.fn(async () => ({ groupCode: "TLEVEL-DSD-Y2", status: "enrolled" }));
    render(
      <JoinClassPanel
        platformState="no-enrolment"
        platform={{
          onboarding: {
            getPending: () => null,
            complete: vi.fn(),
            joinClass
          },
          learner: {
            getState: () => ({
              status: "authenticated",
              context: {
                firstName: "Linked",
                surname: "Learner",
                studentNumber: "123456",
                enrolments: []
              }
            })
          }
        }}
        onSignIn={vi.fn()}
        onSwitchAccount={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Class registration key/i), {
      target: { value: EXPECTED_REGISTRATION_KEY }
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Join class" }));
    });
    await waitFor(() => expect(joinClass).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("button", { name: "Switch account" })).toBeNull();
    expect(screen.getByRole("button", { name: "Account" })).toBeTruthy();
  });

  it("guest Sign in opens Core Sign in dialog without legacy auth fields", () => {
    const onSignIn = vi.fn();
    render(
      <JoinClassPanel
        platformState="signed-out"
        platform={{}}
        onSignIn={onSignIn}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });
});
