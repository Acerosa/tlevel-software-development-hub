/**
 * T Level per-hub Auth restore can lag behind Core's first learner.refresh().
 * Core getProfile() then calls ensure_learner_auth_link with only the
 * publishable key → HTTP 403 (42501) and empty my_profile → stuck
 * onboarding-required. Wait for a user access token before those RPCs.
 */

const LEARNER_RPC = /\/rest\/v1\/(?:rpc\/ensure_learner_auth_link|rpc\/resolve_learner_hub_access|rpc\/my_hub_assignments|my_profile|my_enrolments|my_assignments)(?:\?|$)/;

export function isUserAccessToken(authorization: string | null | undefined): boolean {
  const value = String(authorization || "").trim();
  if (!value.toLowerCase().startsWith("bearer ")) return false;
  const token = value.slice(7).trim();
  // User JWTs are compact JWS; publishable keys are sb_publishable_…
  return token.startsWith("eyJ");
}

type SessionClient = {
  auth: {
    getSession: () => Promise<{ data: { session: { access_token?: string } | null } }>;
  };
};

export async function waitForUserAccessToken(
  getClient: () => SessionClient | null | undefined,
  timeoutMs = 2500
): Promise<string | null> {
  const started = Date.now();
  let delay = 25;
  while (Date.now() - started < timeoutMs) {
    const client = getClient();
    if (client?.auth?.getSession) {
      try {
        const { data } = await client.auth.getSession();
        const token = data?.session?.access_token;
        if (token && token.startsWith("eyJ")) return token;
      } catch {
        // Keep waiting until timeout.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 2, 200);
  }
  return null;
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return String((input as Request).url || "");
}

function emptyJsonResponse(): Response {
  return new Response("[]", {
    status: 200,
    headers: { "Content-Type": "application/json;charset=UTF-8" }
  });
}

/**
 * Wrap fetch so authenticated-only learner RPCs never run as publishable/anon
 * during Auth restore. After timeout with no session, skip ensure (avoid 403
 * noise) and allow other reads to proceed empty.
 */
export function createAuthGatedFetch(
  getClient: () => SessionClient | null | undefined,
  innerFetch: typeof fetch = fetch
): typeof fetch {
  return async function authGatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = requestUrl(input);
    if (!LEARNER_RPC.test(url)) {
      return innerFetch(input, init);
    }

    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    const existing = headers.get("Authorization");
    if (isUserAccessToken(existing)) {
      return innerFetch(input, init);
    }

    const token = await waitForUserAccessToken(getClient);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      const nextInit: RequestInit = { ...(init || {}), headers };
      console.info("TLEVEL_AUTH_GATE_ATTACHED", {
        rpc: url.split("/rest/v1/")[1] || url,
        waitedMs: true
      });
      return innerFetch(input, nextInit);
    }

    if (url.includes("ensure_learner_auth_link")) {
      console.info("TLEVEL_AUTH_GATE_SKIP_ENSURE", { reason: "no-user-session" });
      return emptyJsonResponse();
    }

    console.info("TLEVEL_AUTH_GATE_NO_SESSION", {
      rpc: url.split("/rest/v1/")[1] || url
    });
    return innerFetch(input, init);
  };
}
