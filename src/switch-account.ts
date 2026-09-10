/**
 * Leave the wrong hub Auth session and open Core Sign in.
 *
 * Uses Core local sign-out only (per-hub auth storage). Clears this hub's
 * pending-onboarding session key; does not touch other hubs' storage.
 */
export async function switchHubAccount({
  clearPending,
  signOut,
  openSignIn,
  trigger = null
}: {
  clearPending?: () => void;
  signOut: () => Promise<unknown>;
  openSignIn: (trigger?: EventTarget | null) => void;
  trigger?: EventTarget | null;
}): Promise<void> {
  clearPending?.();
  await signOut();
  openSignIn(trigger);
}
