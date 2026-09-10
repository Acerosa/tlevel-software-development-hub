/**
 * Scroll/focus the in-page JoinClass panel instead of opening Core onboarding.
 * Returning learners must stay on the class-key path; Core's identity form is
 * only for true Auth users with no linked learner profile.
 */
export function focusJoinClassPanel(root: ParentNode = document): boolean {
  const panel = root.querySelector<HTMLElement>("[data-lp-join-class]");
  if (!panel) return false;
  if (typeof panel.scrollIntoView === "function") {
    panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  const keyInput = panel.querySelector<HTMLInputElement>(
    "input[data-join-class-key], input[name='registrationKey'], input[name='firstName']"
  );
  keyInput?.focus();
  return true;
}

/**
 * Core showOnboarding is only for Auth with no linked learner.
 * If learner context already resolved as authenticated, keep JoinClass.
 */
export function shouldOpenCoreOnboarding(
  platformState: string,
  learnerStatus?: string | null
): boolean {
  if (String(learnerStatus || "").trim() === "authenticated") return false;
  return platformState === "onboarding-required";
}
