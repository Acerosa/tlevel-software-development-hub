const STUDENT_NUMBER_LINKED =
  "That Student ID is already linked to another learning account. Sign in with that account, or use your own Student ID.";
const PROFILE_CONFLICT =
  "Your signed-in account does not match that learner profile. Sign in with the account you used before, or contact your tutor.";
const DEFAULT_JOIN =
  "Could not join your class. Check the registration key and try again.";

function tokensFrom(failure: unknown): string[] {
  if (!failure || typeof failure !== "object") return [];
  const value = failure as {
    code?: unknown;
    message?: unknown;
    learnerMessage?: unknown;
    cause?: unknown;
  };
  return [
    value.code,
    value.message,
    value.learnerMessage,
    ...tokensFrom(value.cause)
  ]
    .map((part) => String(part || "").toUpperCase())
    .filter(Boolean);
}

/** True when JoinClass failed because the Student ID is owned by another Auth user. */
export function isStudentNumberAlreadyLinked(failure: unknown): boolean {
  return tokensFrom(failure).some((token) => token.includes("STUDENT_NUMBER_ALREADY_LINKED"));
}

/** Map JoinClass / onboarding failures to learner-safe copy. */
export function joinClassFailureMessage(failure: unknown): string {
  const tokens = tokensFrom(failure);
  if (isStudentNumberAlreadyLinked(failure)) {
    return STUDENT_NUMBER_LINKED;
  }
  if (tokens.some((token) =>
    token.includes("ONBOARDING_CONFLICT")
    || token.includes("AUTH_ACCOUNT_ALREADY_LINKED")
  )) {
    return PROFILE_CONFLICT;
  }
  if (failure && typeof failure === "object" && "learnerMessage" in failure) {
    const message = String((failure as { learnerMessage?: string }).learnerMessage || "").trim();
    if (message) return message;
  }
  return DEFAULT_JOIN;
}

export function shouldCompleteProfileBeforeJoin(platformState: string): boolean {
  return platformState === "onboarding-required";
}
