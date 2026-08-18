import { createPlatform } from "@learning-platform/core";
import { createClient } from "@supabase/supabase-js";
import { validatePackage } from "@learning-platform/content";
import { APP_CONFIG } from "./config";
import { createSitePath } from "./paths";
import { SUPABASE_CONFIG } from "./supabase-config";

export function createHubPlatform(root: string, createPlatformFn = createPlatform) {
  const client = createClient(SUPABASE_CONFIG.projectUrl, SUPABASE_CONFIG.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  const platform = createPlatformFn({
    hubCode: APP_CONFIG.hubId,
    courseKey: APP_CONFIG.courseKey,
    hubName: APP_CONFIG.siteName,
    platformVersion: APP_CONFIG.coreVersion,
    accountPath: createSitePath(root),
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
    validatePackage,
    loadBundled: () => import("../content/tlevel-software-development/package.json").then((mod) => mod.default)
  });

  return Object.freeze({
    ...platform,
    client,
    assignment: platform.assignments || platform.assignment,
    enrolment: platform.enrolments || platform.enrolment,
    flags: platform.features || platform.flags
  });
}

export type HubPlatform = ReturnType<typeof createHubPlatform>;
