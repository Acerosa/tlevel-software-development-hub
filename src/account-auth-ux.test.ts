import { createAccountDialog, createPlatform } from "@learning-platform/core";
import { afterEach, describe, expect, it } from "vitest";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) { return values.has(key) ? values.get(key)! : null; },
    setItem(key: string, value: string) { values.set(key, String(value)); },
    removeItem(key: string) { values.delete(key); }
  };
}

function fakeClient() {
  const calls: Array<{ type: string; credentials?: { email?: string; password?: string } }> = [];
  return {
    calls,
    auth: {
      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
      getSession() { return Promise.resolve({ data: { session: null }, error: null }); },
      async signInWithPassword(credentials: { email?: string; password?: string }) {
        calls.push({ type: "sign-in", credentials });
        return { data: { session: { access_token: "test" } }, error: null };
      },
      async signUp(credentials: { email?: string; password?: string }) {
        calls.push({ type: "sign-up", credentials });
        return { data: { session: null, user: { id: "auth-user" } }, error: null };
      },
      signOut() { return Promise.resolve({ error: null }); }
    },
    schema() {
      return {
        from() {
          return {
            select() { return this; },
            eq() { return this; },
            order() { return this; },
            then(resolve: (value: unknown) => unknown) {
              return Promise.resolve({ data: [], error: null }).then(resolve);
            }
          };
        },
        rpc() { return Promise.resolve({ data: [], error: null }); }
      };
    }
  };
}

describe("T Level learner account dialog", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("labels sign-in as email and does not send a student ID to password auth", async () => {
    const client = fakeClient();
    const platform = createPlatform({
      hubCode: "tlevel-software-development",
      hubName: "T Level Digital Software Development Hub",
      supabase: {
        projectUrl: "https://example.supabase.co",
        publishableKey: "sb_publishable_example"
      }
    }, {
      supabaseClient: client,
      sessionStorage: memoryStorage(),
      localStorage: memoryStorage()
    });
    const dialog = createAccountDialog({
      authService: platform.auth,
      learnerContext: platform.learner,
      onboardingService: platform.onboarding
    });
    document.body.append(dialog.element);
    dialog.open();

    const labels = Array.from(dialog.element.querySelectorAll(".lp-form__field"))
      .filter((field) => !(field as HTMLElement).hidden)
      .map((field) => field.querySelector("label")?.textContent);
    expect(labels).toEqual(["Email", "Password"]);
    expect(dialog.element.textContent).toContain("New here? Create an account first.");
    expect(dialog.element.textContent).not.toContain("Username");

    const email = dialog.element.querySelector("#lp-account-email") as HTMLInputElement;
    const password = dialog.element.querySelector("#lp-account-password") as HTMLInputElement;
    email.value = "00012345";
    password.value = "password-123";
    dialog.element.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.calls.filter((call) => call.type === "sign-in")).toHaveLength(0);
    expect(dialog.element.querySelector(".lp-form__status")?.textContent).toBe("Enter a valid email address.");

    email.value = "qa.learner@example.invalid";
    password.value = "password-123";
    dialog.element.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.calls.at(-1)).toEqual({
      type: "sign-in",
      credentials: { email: "qa.learner@example.invalid", password: "password-123" }
    });
    platform.destroy();
  });
});
