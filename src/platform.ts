import { createPlatform } from "@learning-platform/core";
import { createSupabaseClient } from "@learning-platform/core/advanced";
import { createClient } from "@supabase/supabase-js";
import { validateLearnerSafePackage } from "@learning-platform/content";
import { createAuthGatedFetch } from "./auth-gated-fetch";
import { APP_CONFIG } from "./config";
import { createSitePath } from "./paths";
import { SUPABASE_CONFIG } from "./supabase-config";

export function createHubPlatform(root: string, createPlatformFn = createPlatform) {
  // Late-bound client so the auth gate can await getSession during restore.
  let clientRef: { auth: { getSession: () => Promise<{ data: { session: { access_token?: string } | null } }> } } | null = null;
  const gatedFetch = createAuthGatedFetch(() => clientRef);

  const client = createSupabaseClient({
    projectUrl: SUPABASE_CONFIG.projectUrl,
    publishableKey: SUPABASE_CONFIG.publishableKey,
    hubCode: APP_CONFIG.hubId
  }, {
    createClient: (url: string, key: string, options?: Record<string, unknown>) => createClient(url, key, {
      ...options,
      global: { fetch: gatedFetch }
    })
  });
  clientRef = client as typeof clientRef;

  const platform = createPlatformFn({
    hubCode: APP_CONFIG.hubId,
    courseKey: APP_CONFIG.courseKey,
    hubName: APP_CONFIG.siteName,
    platformVersion: APP_CONFIG.coreVersion,
    accountPath: createSitePath(root),
    hubRootPath: createSitePath(root),
    supabase: {
      projectUrl: SUPABASE_CONFIG.projectUrl,
      publishableKey: SUPABASE_CONFIG.publishableKey
    },
    navigation: APP_CONFIG.navigation.map((item) => ({
      ...item,
      path: item.id === "home" ? createSitePath(root) : createSitePath(root, item.path)
    })),
    navigationMode: "as-supplied",
    features: APP_CONFIG.features,
    theme: APP_CONFIG.theme
  }, {
    supabaseClient: client,
    localStorage: typeof window !== "undefined" ? window.localStorage : undefined,
    // Published packages are learner-safe (answer maps stripped). Authoring validatePackage
    // must not gate hydration — that rejects stripped drag-drop blocks.
    validatePackage: validateLearnerSafePackage,
    fetch: gatedFetch,
    loadBundled: () => import("../content/tlevel-software-development/package.json").then((mod) => mod.default)
  });

  /**
   * After Core initialise, Auth may have published authenticated while the first
   * learner.refresh still used a publishable-only probe. Re-confirm session and
   * refresh so onboarding-required cannot stick from a pre-auth empty profile.
   */
  async function recoverLearnerAfterAuthRestore() {
    const auth = platform.auth.getState?.();
    if (auth?.status !== "authenticated") return;
    try {
      await client.auth.getSession();
    } catch {
      return;
    }
    try {
      await platform.learner.refresh?.();
    } catch {
      // Keep whatever state Core published; UI gates still avoid identity flash.
    }
    const learner = platform.learner.getState?.();
    if (learner?.status !== "onboarding-required") return;
    await new Promise((resolve) => setTimeout(resolve, 150));
    try {
      await client.auth.getSession();
      await platform.learner.refresh?.();
    } catch {
      // Final state stands.
    }
  }

  const coreInitialise = platform.initialise.bind(platform);
  async function initialise() {
    const started = Date.now();
    const snapshot = await coreInitialise();
    await recoverLearnerAfterAuthRestore();
    const auth = platform.auth.getState?.();
    const learner = platform.learner.getState?.();
    const platformStatus = platform.state.getState?.()?.status || snapshot?.status || null;
    console.info("TLEVEL_PLATFORM_STARTUP", {
      coreVersion: APP_CONFIG.coreVersion,
      hubCode: APP_CONFIG.hubId,
      elapsedMs: Date.now() - started,
      authUserId: auth?.session?.user?.id || null,
      authStatus: auth?.status || null,
      platformStatus,
      learnerStatus: learner?.status || null,
      studentNumber: learner?.context?.studentNumber || null,
      joinNeeded: learner?.status === "onboarding-required"
        || platformStatus === "no-enrolment"
        || platformStatus === "onboarding-required"
    });
    return platform.state.getState?.() || snapshot;
  }

  return Object.freeze({
    ...platform,
    initialise,
    client,
    assignment: platform.assignments || platform.assignment,
    enrolment: platform.enrolments || platform.enrolment,
    flags: platform.features || platform.flags
  });
}

export type HubPlatform = ReturnType<typeof createHubPlatform>;
