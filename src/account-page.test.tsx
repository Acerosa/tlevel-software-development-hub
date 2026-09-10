/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountPage } from "./pages/AccountPage";

afterEach(() => {
  cleanup();
});

describe("T Level canonical account page", () => {
  it("opens Core sign-in and create-account without a hub-owned signup form", () => {
    const onSignIn = vi.fn();
    const onCreateAccount = vi.fn();
    render(<AccountPage onSignIn={onSignIn} onCreateAccount={onCreateAccount} />);

    expect(screen.getByRole("heading", { name: "Learner account" })).toBeTruthy();
    expect(screen.queryByLabelText(/First name/i)).toBeNull();
    expect(screen.queryByLabelText(/College email address/i)).toBeNull();
    expect(screen.queryByText(/Step 1 of 2/i)).toBeNull();
    expect(screen.getByText(/Joining your T Level class is a separate step/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(onCreateAccount).toHaveBeenCalledTimes(1);
  });

  it("calls refreshHubSession() and reopens Sign in when requiresSignIn", async () => {
    const refreshHubSession = vi.fn(async () => ({
      ok: false,
      status: "signed-out",
      requiresSignIn: true,
      learnerMessage: "Your session needs to be refreshed. Please sign in again."
    }));
    const onSignIn = vi.fn();

    render(
      <AccountPage
        onSignIn={onSignIn}
        onCreateAccount={vi.fn()}
        platform={{ refreshHubSession }}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh session" }));
    });

    await waitFor(() => expect(refreshHubSession).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/session needs to be refreshed/i)).toBeTruthy();
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it("reports success when refreshHubSession returns ok", async () => {
    const refreshHubSession = vi.fn(async () => ({
      ok: true,
      status: "ready",
      requiresSignIn: false
    }));
    render(
      <AccountPage
        onSignIn={vi.fn()}
        onCreateAccount={vi.fn()}
        platform={{ refreshHubSession }}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh session" }));
    });

    await waitFor(() => expect(refreshHubSession).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Session refreshed/i)).toBeTruthy();
  });

  it("does not render Refresh session when no platform is supplied", () => {
    render(<AccountPage onSignIn={vi.fn()} onCreateAccount={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Refresh session" })).toBeNull();
  });
});
