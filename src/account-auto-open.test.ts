import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { accountPageAutoOpenAction } from "./account-auto-open";

describe("account page auto-open", () => {
  it("opens Core sign-in once for a signed-out learner", () => {
    expect(accountPageAutoOpenAction("account", "signed-out", false)).toBe("sign-in");
    expect(accountPageAutoOpenAction("account", "signed-out", true)).toBeNull();
  });

  it("does not reopen after signup returns the learner to signed-out", () => {
    expect(accountPageAutoOpenAction("account", "signing-in", true)).toBeNull();
    expect(accountPageAutoOpenAction("account", "signed-out", true)).toBeNull();
  });

  it("opens onboarding once for an authenticated learner who still needs a profile", () => {
    expect(accountPageAutoOpenAction("account", "onboarding-required", false)).toBe("onboarding");
    expect(accountPageAutoOpenAction("account", "onboarding-required", true)).toBeNull();
  });

  it("does not auto-open Core on other pages", () => {
    expect(accountPageAutoOpenAction("home", "signed-out", false)).toBeNull();
  });

  it("keeps App wired to useHubPlatform so Core and curriculum stay in the bundle", () => {
    const app = readFileSync(resolve("src/App.tsx"), "utf8");
    expect(app).toContain('import { useHubPlatform } from "./hooks/useHubPlatform"');
  });
});
