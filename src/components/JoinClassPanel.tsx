import { FormEvent, useEffect, useState } from "react";
import {
  EXPECTED_GROUP_CODE,
  JOIN_CLASS_PROMPT,
  SIGN_IN_TO_CONTINUE,
  hasExpectedGroupEnrolment,
  isAcceptedTLevelGroupCode,
  needsJoinClass,
  normaliseRegistrationKey,
  type EnrolmentRow
} from "../enrolment";
import {
  isStudentNumberAlreadyLinked,
  joinClassFailureMessage,
  shouldCompleteProfileBeforeJoin
} from "../join-class-errors";
import { createSitePath } from "../paths";

type ProfileFields = {
  firstName: string;
  surname: string;
  studentNumber: string;
};

type OnboardingService = {
  getPending?: () => Partial<ProfileFields> & { registrationKey?: string } | null;
  complete?: (details: ProfileFields) => Promise<unknown>;
  joinClass?: (classKey: string) => Promise<unknown>;
};

type JoinClassPanelProps = {
  platformState: string;
  platform: {
    onboarding?: OnboardingService;
    learner?: {
      getState?: () => {
        status?: string;
        context?: {
          firstName?: string;
          surname?: string;
          studentNumber?: string;
          groupName?: string;
          groupCode?: string;
          yearGroup?: string;
          enrolments?: unknown[];
        } | null;
      };
    };
  };
  root?: string;
  compact?: boolean;
  onJoined?: () => void;
  onSignIn?: (trigger?: EventTarget | null) => void;
  onSwitchAccount?: (trigger?: EventTarget | null) => void | Promise<void>;
};

function profileFromPlatform(platform: JoinClassPanelProps["platform"]): ProfileFields {
  const pending = platform.onboarding?.getPending?.() || null;
  const context = platform.learner?.getState?.()?.context;
  return {
    firstName: String(pending?.firstName || context?.firstName || "").trim(),
    surname: String(pending?.surname || context?.surname || "").trim(),
    studentNumber: String(pending?.studentNumber || context?.studentNumber || "").trim()
  };
}

function tlevelEnrolment(enrolments: EnrolmentRow[] | null | undefined) {
  return (enrolments || []).find((row) =>
    String(row?.status || "").toLowerCase() === "active"
    && isAcceptedTLevelGroupCode(row?.groupCode)
  ) || null;
}

export function JoinClassPanel({
  platformState,
  platform,
  root = ".",
  compact = false,
  onJoined,
  onSignIn,
  onSwitchAccount
}: JoinClassPanelProps) {
  const context = platform.learner?.getState?.()?.context;
  const enrolments = (context?.enrolments || null) as EnrolmentRow[] | null;
  const accessNeedsJoin = needsJoinClass(platformState, { enrolments });
  const enrolled = (platformState === "ready" || platformState === "no-assignments")
    && hasExpectedGroupEnrolment(enrolments);
  const guest = platformState === "signed-out";
  const initial = profileFromPlatform(platform);

  const [firstName, setFirstName] = useState(initial.firstName);
  const [surname, setSurname] = useState(initial.surname);
  const [studentNumber, setStudentNumber] = useState(initial.studentNumber);
  const [registrationKey, setRegistrationKey] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [offerSwitchAccount, setOfferSwitchAccount] = useState(false);

  useEffect(() => {
    const next = profileFromPlatform(platform);
    if (next.firstName) setFirstName(next.firstName);
    if (next.surname) setSurname(next.surname);
    if (next.studentNumber) setStudentNumber(next.studentNumber);
  }, [platform, platformState]);

  if (guest) {
    return (
      <section className="join-class panel" data-lp-join-class="guest" aria-labelledby="join-class-heading">
        <h2 id="join-class-heading">{SIGN_IN_TO_CONTINUE}</h2>
        <p>Sign in to join your T Level class and check answers against your learning record.</p>
        <div className="join-class__actions">
          <button
            className="lp-button"
            type="button"
            data-join-class-sign-in=""
            onClick={(event) => onSignIn?.(event.currentTarget)}
          >
            Sign in
          </button>
          {onSignIn ? (
            <button
              className="lp-button lp-button--secondary"
              type="button"
              data-join-class-open-account=""
              onClick={(event) => onSignIn(event.currentTarget)}
            >
              Open Account
            </button>
          ) : (
            <a className="lp-button lp-button--secondary" href={createSitePath(root, "account/")}>
              Open Account
            </a>
          )}
        </div>
      </section>
    );
  }

  if (enrolled) {
    const joined = tlevelEnrolment(enrolments);
    const groupLabel = [joined?.yearGroup || context?.yearGroup, joined?.groupName || joined?.groupCode || EXPECTED_GROUP_CODE]
      .filter(Boolean)
      .join(" — ") || "Your T Level class";
    return (
      <section className="join-class panel" data-lp-join-class="enrolled" aria-labelledby="join-class-heading">
        <h2 id="join-class-heading">Your class</h2>
        <p data-join-class-status="joined">You are joined to <strong>{groupLabel}</strong>.</p>
        {!compact ? (
          <p className="join-class__hint">You can check answers for assigned T Level activities.</p>
        ) : null}
      </section>
    );
  }

  if (!accessNeedsJoin) return null;

  const learnerStatus = platform.learner?.getState?.()?.status || null;
  // Returning learners: class-key only. Identity fields only for true first-time
  // Auth users (onboarding-required, no linked profile).
  const needsProfileFields = shouldCompleteProfileBeforeJoin(platformState, learnerStatus);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    setOfferSwitchAccount(false);
    setStatus("Joining your class…");
    const key = normaliseRegistrationKey(registrationKey);
    const details = {
      firstName: firstName.trim(),
      surname: surname.trim(),
      studentNumber: studentNumber.trim()
    };
    try {
      if (!key) {
        throw Object.assign(new Error("Enter your class registration key."), {
          learnerMessage: "Enter the class registration key from your tutor."
        });
      }
      if (typeof platform.onboarding?.joinClass !== "function") {
        throw Object.assign(new Error("Join class is unavailable."), {
          learnerMessage: "Join class is unavailable right now. Try again shortly."
        });
      }
      // Profile linking is not class-key enrolment. Only complete when Core still
      // requires onboarding; otherwise Student ID conflicts mask join_learner_hub_group.
      const mustCompleteProfile = shouldCompleteProfileBeforeJoin(platformState, learnerStatus);
      if (mustCompleteProfile) {
        if (!details.firstName || !details.surname || !details.studentNumber) {
          throw Object.assign(new Error("Enter your learner details."), {
            learnerMessage: "Enter your first name, surname and Student ID."
          });
        }
        if (typeof platform.onboarding?.complete === "function") {
          await platform.onboarding.complete(details);
        }
      }
      await platform.onboarding.joinClass(key);
      setStatus("You have joined your class.");
      onJoined?.();
    } catch (failure) {
      setError(true);
      setOfferSwitchAccount(isStudentNumberAlreadyLinked(failure));
      setStatus(joinClassFailureMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`join-class panel${compact ? " join-class--compact" : ""}`}
      data-lp-join-class="needs-join"
      aria-labelledby="join-class-heading"
    >
      <h2 id="join-class-heading">{JOIN_CLASS_PROMPT}</h2>
      <p>
        Enter the registration key from your tutor to join your T Level class.
        Activities stay readable, but Check answer needs a class enrolment.
      </p>
      <form className="join-class__form lp-form" onSubmit={handleSubmit} noValidate>
        {needsProfileFields ? (
          <>
            <label className="lp-form__field">
              <span>First name</span>
              <input
                name="firstName"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
              />
            </label>
            <label className="lp-form__field">
              <span>Surname</span>
              <input
                name="surname"
                autoComplete="family-name"
                value={surname}
                onChange={(event) => setSurname(event.target.value)}
                required
              />
            </label>
            <label className="lp-form__field">
              <span>Student ID</span>
              <input
                name="studentNumber"
                autoComplete="off"
                value={studentNumber}
                onChange={(event) => setStudentNumber(event.target.value)}
                required
              />
            </label>
          </>
        ) : null}
        <label className="lp-form__field">
          <span>Class registration key</span>
          <input
            name="registrationKey"
            data-join-class-key=""
            autoComplete="off"
            spellCheck={false}
            value={registrationKey}
            onChange={(event) => setRegistrationKey(event.target.value)}
            placeholder="Enter the key from your tutor"
            required
          />
        </label>
        <p
          className={error ? "join-class__status join-class__status--error" : "join-class__status"}
          role={error ? "alert" : "status"}
          aria-live="polite"
        >
          {status}
        </p>
        <div className="join-class__actions">
          <button className="lp-button" type="submit" disabled={busy} data-join-class-submit="">
            {busy ? "Joining…" : "Join class"}
          </button>
          {offerSwitchAccount && onSwitchAccount ? (
            <button
              className="lp-button lp-button--secondary"
              type="button"
              data-join-class-switch-account=""
              disabled={busy}
              onClick={(event) => { void onSwitchAccount(event.currentTarget); }}
            >
              Switch account
            </button>
          ) : onSignIn ? (
            <button
              className="lp-button lp-button--secondary"
              type="button"
              data-join-class-open-account=""
              onClick={(event) => onSignIn(event.currentTarget)}
            >
              Account
            </button>
          ) : (
            <a className="lp-button lp-button--secondary" href={createSitePath(root, "account/")}>
              Account
            </a>
          )}
        </div>
      </form>
    </section>
  );
}
