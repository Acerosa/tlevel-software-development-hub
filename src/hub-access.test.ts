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

function fakeClient({
  session = { access_token: "managed", user: { id: "auth-user" } },
  enrolments = [{ status: "active", group_code: "TLEVEL-DSD-Y2", year_group: "Year 2" }],
  assignments = [
    { activity_key: "week2-malware-symptoms" },
    { activity_key: "foundations-requirements-classification" }
  ],
  access = { status: "enrolled", group_code: "TLEVEL-DSD-Y2", year_group: "Year 2" },
  hubAssignments = [{ activity_key: "foundations-requirements-classification" }]
}: {
  session?: { access_token: string; user: { id: string } } | null;
  enrolments?: Array<Record<string, string>>;
  assignments?: Array<Record<string, string>>;
  access?: Record<string, unknown>;
  hubAssignments?: Array<Record<string, string>>;
} = {}) {
  const calls: Array<{ type: string; name?: string; payload?: unknown }> = [];
  return {
    calls,
    auth: {
      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
      getSession() { return Promise.resolve({ data: { session }, error: null }); },
      signInWithPassword() { return Promise.resolve({ data: { session }, error: null }); },
      signUp() { return Promise.resolve({ data: { session: null, user: { id: "auth-user" } }, error: null }); },
      signOut() { return Promise.resolve({ error: null }); }
    },
    schema() {
      return {
        from(view: string) {
          calls.push({ type: "view", name: view });
          const data = view === "my_profile"
            ? [{ student_number: "000123", first_name: "Ada", surname: "Lovelace" }]
            : view === "my_enrolments"
              ? enrolments
              : view === "my_assignments"
                ? assignments
                : [];
          return {
            select() { return this; },
            eq() { return this; },
            order() { return this; },
            then(resolve: (value: unknown) => unknown) {
              return Promise.resolve({ data, error: null }).then(resolve);
            }
          };
        },
        rpc(name: string, payload: unknown) {
          calls.push({ type: "rpc", name, payload });
          if (name === "resolve_learner_hub_access") {
            const groupCode = typeof access.group_code === "string" ? access.group_code : "";
            const yearGroup = typeof access.year_group === "string" ? access.year_group : "";
            if (
              (access.status === "enrolled_created" || access.status === "enrolled_reactivated")
              && groupCode
              && !enrolments.some((item) => item.group_code === groupCode && item.status === "active")
            ) {
              enrolments.push({ status: "active", group_code: groupCode, year_group: yearGroup });
            }
            return Promise.resolve({ data: [access], error: null });
          }
          const data = name === "my_hub_assignments" ? hubAssignments : [];
          return Promise.resolve({ data, error: null });
        }
      };
    }
  };
}

describe("T Level hub access", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("auto-enrols a Cyber-enrolled learner into the single T Level open_auto group", async () => {
    const client = fakeClient({
      enrolments: [{ status: "active", group_code: "CYBER-TEST-A", year_group: "Year 1" }],
      access: { status: "enrolled_created", group_code: "TLEVEL-DSD-Y2", year_group: "Year 2" },
      hubAssignments: [{ activity_key: "foundations-requirements-classification" }]
    });
    const platform = createPlatform({
      hubCode: "tlevel-software-development",
      hubName: "T Level Digital Software Development Hub",
      courseKey: "t-level-digital-software-development"
    }, {
      supabaseClient: client,
      sessionStorage: memoryStorage(),
      localStorage: memoryStorage(),
      document: null,
      window: null
    });
    await platform.initialise();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(platform.state.getState().status).toBe("ready");
    expect(platform.learner.getContext().groupCode).toBe("TLEVEL-DSD-Y2");
    expect(platform.learner.getContext().yearGroup).toBe("Year 2");
    expect(await platform.assignments.getHubAssignments("tlevel-software-development")).toEqual([
      { activity_key: "foundations-requirements-classification" }
    ]);
    platform.destroy();
  });

  it("auto-enrols an L2E-enrolled learner into the single T Level open_auto group", async () => {
    const client = fakeClient({
      enrolments: [{ status: "active", group_code: "L2E-DELIVERY-A", year_group: "Year 1" }],
      access: { status: "enrolled_created", group_code: "TLEVEL-DSD-Y2", year_group: "Year 2" },
      hubAssignments: [{ activity_key: "foundations-requirements-classification" }]
    });
    const platform = createPlatform({
      hubCode: "tlevel-software-development",
      hubName: "T Level Digital Software Development Hub",
      courseKey: "t-level-digital-software-development"
    }, {
      supabaseClient: client,
      sessionStorage: memoryStorage(),
      localStorage: memoryStorage(),
      document: null,
      window: null
    });
    await platform.initialise();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(platform.state.getState().status).toBe("ready");
    expect(platform.learner.getContext().groupCode).toBe("TLEVEL-DSD-Y2");
    expect(platform.learner.getContext().yearGroup).toBe("Year 2");
    expect(await platform.assignments.getHubAssignments("tlevel-software-development")).toEqual([
      { activity_key: "foundations-requirements-classification" }
    ]);
    platform.destroy();
  });

  it("reactivates a withdrawn T Level enrolment and refreshes learner context", async () => {
    const client = fakeClient({
      enrolments: [
        { status: "active", group_code: "CYBER-TEST-A", year_group: "Year 1" },
        { status: "withdrawn", group_code: "TLEVEL-DSD-Y2", year_group: "Year 2" }
      ],
      access: { status: "enrolled_reactivated", group_code: "TLEVEL-DSD-Y2", year_group: "Year 2" },
      hubAssignments: [{ activity_key: "foundations-requirements-classification" }]
    });
    const platform = createPlatform({
      hubCode: "tlevel-software-development",
      hubName: "T Level Digital Software Development Hub",
      courseKey: "t-level-digital-software-development"
    }, {
      supabaseClient: client,
      sessionStorage: memoryStorage(),
      localStorage: memoryStorage(),
      document: null,
      window: null
    });
    await platform.initialise();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(platform.state.getState().status).toBe("ready");
    expect(platform.learner.getContext().groupCode).toBe("TLEVEL-DSD-Y2");
    expect(platform.learner.getContext().yearGroup).toBe("Year 2");
    expect(client.calls.filter((call) => call.type === "rpc" && call.name === "resolve_learner_hub_access").length).toBeGreaterThanOrEqual(1);
    platform.destroy();
  });

  it("auto-enrols a Unit 14-enrolled learner into the single T Level open_auto group", async () => {
    const client = fakeClient({
      enrolments: [{ status: "active", group_code: "UNIT14-TEST-A", year_group: "Year 1" }],
      access: { status: "enrolled_created", group_code: "TLEVEL-DSD-Y2", year_group: "Year 2" },
      hubAssignments: [{ activity_key: "foundations-requirements-classification" }]
    });
    const platform = createPlatform({
      hubCode: "tlevel-software-development",
      hubName: "T Level Digital Software Development Hub",
      courseKey: "t-level-digital-software-development"
    }, {
      supabaseClient: client,
      sessionStorage: memoryStorage(),
      localStorage: memoryStorage(),
      document: null,
      window: null
    });
    await platform.initialise();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(platform.state.getState().status).toBe("ready");
    expect(platform.learner.getContext().groupCode).toBe("TLEVEL-DSD-Y2");
    expect(platform.learner.getContext().yearGroup).toBe("Year 2");
    expect(await platform.assignments.getHubAssignments("tlevel-software-development")).toEqual([
      { activity_key: "foundations-requirements-classification" }
    ]);
    platform.destroy();
  });

  it("does not treat a Cyber enrolment as T Level authority when the resolver denies T Level", async () => {
    const client = fakeClient({
      enrolments: [{ status: "active", group_code: "CYBER-TEST-A", year_group: "Year 1" }],
      access: { status: "no_enrolment" },
      hubAssignments: [{ activity_key: "week2-malware-symptoms" }]
    });
    const platform = createPlatform({
      hubCode: "tlevel-software-development",
      hubName: "T Level Digital Software Development Hub",
      courseKey: "t-level-digital-software-development"
    }, {
      supabaseClient: client,
      sessionStorage: memoryStorage(),
      localStorage: memoryStorage(),
      document: null,
      window: null
    });
    await platform.initialise();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(platform.state.getState().status).toBe("no-enrolment");
    expect(client.calls.some((call) => call.type === "rpc" && call.name === "my_hub_assignments")).toBe(false);
    platform.destroy();
  });

  it("loads only T Level hub assignments when the learner also has a Cyber enrolment", async () => {
    const client = fakeClient();
    const platform = createPlatform({
      hubCode: "tlevel-software-development",
      hubName: "T Level Digital Software Development Hub",
      courseKey: "t-level-digital-software-development"
    }, {
      supabaseClient: client,
      sessionStorage: memoryStorage(),
      localStorage: memoryStorage(),
      document: null,
      window: null
    });
    await platform.initialise();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(platform.state.getState().status).toBe("ready");
    expect(await platform.assignments.getHubAssignments("tlevel-software-development")).toEqual([
      { activity_key: "foundations-requirements-classification" }
    ]);
    platform.destroy();
  });

  it("does not show a year and group picker on T Level onboarding", async () => {
    const client = fakeClient({
      session: { access_token: "managed", user: { id: "auth-user" } },
      enrolments: [],
      access: {
        status: "profile_required",
        registration_option: "tlevel-dsd-y2",
        year_group: "Year 2",
        group_code: "TLEVEL-DSD-Y2",
        group_name: "T Level Year 2",
        course_title: "T Level Digital Software Development"
      }
    });
    const platform = createPlatform({
      hubCode: "tlevel-software-development",
      hubName: "T Level Digital Software Development Hub",
      courseKey: "t-level-digital-software-development"
    }, {
      supabaseClient: client,
      sessionStorage: memoryStorage(),
      localStorage: memoryStorage()
    });
    await platform.initialise();
    const dialog = createAccountDialog({
      authService: platform.auth,
      learnerContext: platform.learner,
      onboardingService: platform.onboarding
    });
    document.body.append(dialog.element);
    dialog.showOnboarding?.();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const picker = dialog.element.querySelector("#lp-registration-option") as HTMLSelectElement | null;
    expect(picker).toBeNull();
    expect(dialog.element.textContent).toContain("Enter your learner details to finish setting up your account.");
    expect(dialog.element.textContent).not.toContain("Choose a year and group");
    dialog.destroy?.();
    platform.destroy();
  });
});
