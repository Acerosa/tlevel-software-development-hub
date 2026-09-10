export function accountPageAutoOpenAction(
  view: string,
  platformState: string,
  alreadyOpened: boolean
): "onboarding" | "sign-in" | null {
  if (view !== "account" || alreadyOpened) return null;
  if (platformState === "loading" || platformState === "signing-in") return null;
  if (platformState === "onboarding-required") return "onboarding";
  if (platformState === "signed-out") return "sign-in";
  return null;
}
