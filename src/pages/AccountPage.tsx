import { useState } from "react";

type RefreshResult = {
  ok?: boolean;
  status?: string;
  requiresSignIn?: boolean;
  learnerMessage?: string;
};

type HubPlatform = {
  refreshHubSession?: () => Promise<RefreshResult | undefined>;
};

type AccountPageProps = {
  onSignIn: (trigger?: EventTarget | null) => void;
  onCreateAccount: (trigger?: EventTarget | null) => void;
  platform?: HubPlatform;
};

export function AccountPage({ onSignIn, onCreateAccount, platform }: AccountPageProps) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleRefresh(event: React.MouseEvent<HTMLButtonElement>) {
    if (typeof platform?.refreshHubSession !== "function") return;
    setBusy(true);
    setError(false);
    setStatus("Refreshing your session…");
    try {
      const result = await platform.refreshHubSession();
      const message = result?.learnerMessage
        || (result?.ok ? "Session refreshed." : "Could not refresh session.");
      setStatus(message);
      setError(!result?.ok);
      if (result?.requiresSignIn) {
        onSignIn(event.currentTarget);
      }
    } catch (failure) {
      setError(true);
      const message = (failure && typeof failure === "object" && "learnerMessage" in failure)
        ? String((failure as { learnerMessage?: string }).learnerMessage || "")
        : "";
      setStatus(message || "Could not refresh session. Try signing in again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel tlevel-account" aria-labelledby="account-heading" data-tlevel-account="core">
      <h2 id="account-heading">Learner account</h2>
      <p>
        Sign in or create an account to save your T Level progress.
        If you already created an account on another learning hub, sign in using
        the same email and password.
      </p>
      <p>
        Joining your T Level class is a separate step. After you are signed in,
        enter the class registration key from your tutor.
      </p>
      <div className="tlevel-account__actions">
        <button
          className="lp-button"
          type="button"
          data-account-sign-in=""
          onClick={(event) => onSignIn(event.currentTarget)}
        >
          Sign in
        </button>
        <button
          className="lp-button lp-button--secondary"
          type="button"
          data-account-create=""
          onClick={(event) => onCreateAccount(event.currentTarget)}
        >
          Create account
        </button>
        {typeof platform?.refreshHubSession === "function" ? (
          <button
            className="lp-button lp-button--secondary"
            type="button"
            data-account-refresh-session=""
            disabled={busy}
            onClick={handleRefresh}
          >
            {busy ? "Refreshing…" : "Refresh session"}
          </button>
        ) : null}
      </div>
      {status ? (
        <p
          className={error ? "tlevel-account__status tlevel-account__status--error" : "tlevel-account__status"}
          role={error ? "alert" : "status"}
          aria-live="polite"
          data-account-refresh-status=""
        >
          {status}
        </p>
      ) : null}
    </section>
  );
}
