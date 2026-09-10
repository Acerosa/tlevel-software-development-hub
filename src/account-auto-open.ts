import { shouldOpenCoreOnboarding } from "./focus-join-class";

export function accountPageAutoOpenAction(
  view: string,
  platformState: string,
  alreadyOpened: boolean,
  learnerStatus?: string | null
): "onboarding" | "sign-in" | null {
  if (view !== "account" || alreadyOpened) return null;
  if (platformState === "loading" || platformState === "signing-in") return null;
  if (shouldOpenCoreOnboarding(platformState, learnerStatus)) return "onboarding";
  if (platformState === "signed-out") return "sign-in";
  return null;
}
