import { describe, expect, it, vi } from "vitest";
import { shouldCompleteProfileBeforeJoin } from "./join-class-errors";
import { createAuthGatedFetch } from "./auth-gated-fetch";

/**
 * Regression: session unknown → temporary anon/null → authenticated restore
 * must not leave identity onboarding visible for an existing learner.
 */
describe("T Level auth restore race", () => {
  it("keeps identity fields hidden until Auth is definitive", () => {
    expect(shouldCompleteProfileBeforeJoin("onboarding-required", "onboarding-required", "loading")).toBe(false);
    expect(shouldCompleteProfileBeforeJoin("onboarding-required", "loading", "authenticated")).toBe(false);
    expect(shouldCompleteProfileBeforeJoin("onboarding-required", "onboarding-required", "authenticated")).toBe(true);
    expect(shouldCompleteProfileBeforeJoin("no-enrolment", "authenticated", "authenticated")).toBe(false);
    expect(shouldCompleteProfileBeforeJoin("onboarding-required", "authenticated", "authenticated")).toBe(false);
  });

  it("upgrades a publishable-only ensure call once the user JWT appears", async () => {
    const calls: string[] = [];
    let token: string | null = null;
    const inner = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const auth = new Headers(init?.headers).get("Authorization") || "";
      calls.push(auth.startsWith("Bearer eyJ") ? "user" : "publishable");
      return new Response(JSON.stringify([{ linked: false, student_number: "12345" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });
    const gated = createAuthGatedFetch(() => ({
      auth: {
        getSession: async () => ({
          data: { session: token ? { access_token: token } : null }
        })
      }
    }), inner as unknown as typeof fetch);

    const pending = gated("https://example.supabase.co/rest/v1/rpc/ensure_learner_auth_link", {
      method: "POST",
      headers: { Authorization: "Bearer sb_publishable_test" }
    });
    await new Promise((r) => setTimeout(r, 30));
    token = "eyJhbGciOiJIUzI1NiJ9.e30.sig";
    const res = await pending;
    expect(res.status).toBe(200);
    expect(calls).toEqual(["user"]);
    expect(shouldCompleteProfileBeforeJoin("no-enrolment", "authenticated", "authenticated")).toBe(false);
  });
});
