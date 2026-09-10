import { createAccountDialog } from "@learning-platform/core";
import { useEffect, useMemo, useState } from "react";
import type { LearnerSummary, ThemeControl, ThemePreference } from "@learning-platform/ui";
import { loadHubAdapters } from "../adapters/load-hub-adapters";
import { APP_CONFIG } from "../config";
import { loadTLevelCurriculum, type CurriculumRuntime } from "../curriculum/apply-runtime";
import type { ContentPackage } from "../curriculum/from-package";
import { createHubPlatform, type HubPlatform } from "../platform";

type AccountDialog = {
  element: HTMLElement;
  open: (trigger?: EventTarget | null, options?: { mode?: "sign-in" | "register" }) => void;
  showOnboarding?: () => void;
  destroy?: () => void;
};

export type LoadedCurriculum = {
  source: string;
  package: ContentPackage | null;
};

const EMPTY_CURRICULUM: LoadedCurriculum = { source: "none", package: null };

export function useHubPlatform(root: string) {
  const platform = useMemo(() => createHubPlatform(root), [root]);
  const [learner, setLearner] = useState<LearnerSummary | null>(null);
  const [theme, setTheme] = useState<ThemeControl | null>(null);
  const [accountDialog, setAccountDialog] = useState<AccountDialog | null>(null);
  const [platformState, setPlatformState] = useState("loading");
  const [authStatus, setAuthStatus] = useState("signed-out");
  const [adaptersReady, setAdaptersReady] = useState(false);
  const [curriculum, setCurriculum] = useState<LoadedCurriculum>(EMPTY_CURRICULUM);

  useEffect(() => {
    let dialog: AccountDialog | null = null;
    const unsubscribers: Array<() => void> = [];
    let cancelled = false;
    document.body.dataset.platformState = "loading";

    const stopAuth = platform.auth.subscribe?.((authState) => {
      setAuthStatus(authState.status);
    });
    if (stopAuth) unsubscribers.push(stopAuth);
    unsubscribers.push(platform.learner.subscribe((state) => {
      setLearner(state.context || null);
    }));
    unsubscribers.push(platform.state.subscribe((snapshot) => {
      setPlatformState(snapshot.status);
      document.body.dataset.platformState = snapshot.status;
    }));
    if (platform.theme) {
      unsubscribers.push(platform.theme.subscribe((snapshot) => {
        setTheme({
          modes: platform.theme.modes as ThemePreference[],
          preference: snapshot.preference,
          onChange: (mode) => { platform.theme.setPreference(mode); }
        });
      }));
    }

    dialog = createAccountDialog({
      authService: platform.auth,
      learnerContext: platform.learner,
      onboardingService: platform.onboarding
    });
    document.body.appendChild(dialog.element);
    setAccountDialog(dialog);
    window.LearningPlatform = { platform, coreVersion: APP_CONFIG.coreVersion };

    // Start Auth+learner resolve immediately (do not wait for curriculum).
    // Platform initialise also recovers if a pre-auth empty profile probe raced Auth restore.
    void (async () => {
      await loadHubAdapters();
      const ready = platform.initialise();
      try {
        const runtime = await loadTLevelCurriculum(platform) as CurriculumRuntime;
        if (!cancelled) {
          setCurriculum({
            source: runtime.source || "none",
            package: runtime.package || null
          });
        }
      } finally {
        await ready;
        if (!cancelled) setAdaptersReady(true);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribers.forEach((stop) => stop());
      dialog?.element.remove();
      dialog?.destroy?.();
      platform.destroy();
    };
  }, [platform]);

  return {
    platform,
    learner,
    theme,
    accountDialog,
    platformState,
    authStatus,
    adaptersReady,
    curriculum
  };
}

export type { HubPlatform };
