import { describe, expect, it, vi } from "vitest";
import {
  createAuthGatedFetch,
  isUserAccessToken,
  waitForUserAccessToken
} from "./auth-gated-fetch";

describe("isUserAccessToken", () => {
  it("accepts bearer JWTs only", () => {
    expect(isUserAccessToken("Bearer eyJhbGciOiJIUzI1NiJ9.e30.sig")).toBe(true);
    expect(isUserAccessToken("Bearer sb_publishable_abc")).toBe(false);
    expect(isUserAccessToken(null)).toBe(false);
  });
});

describe("waitForUserAccessToken", () => {
  it("returns token once getSession exposes a user JWT", async () => {
    let calls = 0;
    const token = await waitForUserAccessToken(() => ({
      auth: {
        getSession: async () => {
          calls += 1;
          if (calls < 2) return { data: { session: null } };
          return { data: { session: { access_token: "eyJhbGciOiJIUzI1NiJ9.e30.sig" } } };
        }
      }
    }), 1000);
    expect(token?.startsWith("eyJ")).toBe(true);
    expect(calls).toBeGreaterThanOrEqual(2);
  });
});

describe("createAuthGatedFetch", () => {
  it("waits and attaches user JWT before ensure_learner_auth_link", async () => {
    const inner = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const auth = new Headers(init?.headers).get("Authorization");
      expect(auth).toMatch(/^Bearer eyJ/);
      return new Response("[]", { status: 200 });
    });
    let ready = false;
    const gated = createAuthGatedFetch(() => ({
      auth: {
        getSession: async () => ({
          data: { session: ready ? { access_token: "eyJhbGciOiJIUzI1NiJ9.e30.sig" } : null }
        })
      }
    }), inner as unknown as typeof fetch);

    setTimeout(() => { ready = true; }, 40);
    const res = await gated("https://hub.supabase.co/rest/v1/rpc/ensure_learner_auth_link", {
      method: "POST",
      headers: { Authorization: "Bearer sb_publishable_test" }
    });
    expect(res.status).toBe(200);
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it("skips ensure when no session appears (no anon 403)", async () => {
    const inner = vi.fn(async () => new Response("should-not-run", { status: 500 }));
    const gated = createAuthGatedFetch(() => ({
      auth: { getSession: async () => ({ data: { session: null } }) }
    }), inner as unknown as typeof fetch);

    const res = await gated("https://hub.supabase.co/rest/v1/rpc/ensure_learner_auth_link", {
      headers: { Authorization: "Bearer sb_publishable_test" }
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("[]");
    expect(inner).not.toHaveBeenCalled();
  });

  it("does not gate curriculum RPCs", async () => {
    const inner = vi.fn(async () => new Response("{}", { status: 200 }));
    const gated = createAuthGatedFetch(() => null, inner as unknown as typeof fetch);
    await gated("https://hub.supabase.co/rest/v1/rpc/published_curriculum_package", {
      headers: { Authorization: "Bearer sb_publishable_test" }
    });
    expect(inner).toHaveBeenCalledTimes(1);
  });
});
