declare module "@learning-platform/core" {
  export type ThemePreference = "light" | "dark" | "system";

  export interface ThemeService {
    modes: readonly ThemePreference[];
    getPreference(): ThemePreference;
    getResolvedTheme(): "light" | "dark";
    setPreference(mode: ThemePreference): unknown;
    subscribe(listener: (state: { preference: ThemePreference; resolvedTheme: "light" | "dark" }) => void): () => void;
    apply(): unknown;
    destroy(): void;
  }

  export interface LearnerState {
    status: string;
    context?: {
      firstName?: string;
      fullName?: string;
      displayName?: string;
      yearGroup?: string;
      academicYear?: string;
      contactEmail?: string;
    } | null;
  }

  export interface PlatformFacade {
    config: { hubName: string; accountPath: string };
    theme: ThemeService;
    auth: { signOut: () => Promise<void> };
    learner: {
      subscribe: (listener: (state: LearnerState) => void) => () => void;
    };
    state: {
      subscribe: (listener: (snapshot: { status: string }) => void) => () => void;
    };
    onboarding: unknown;
    assignments?: unknown;
    assignment?: unknown;
    enrolments?: unknown;
    enrolment?: unknown;
    features?: unknown;
    flags?: unknown;
    initialise: () => Promise<unknown>;
    destroy: () => void;
  }

  export function createPlatform(options: Record<string, unknown>, dependencies?: Record<string, unknown>): PlatformFacade;
  export function createAccountDialog(options: {
    authService: unknown;
    learnerContext: unknown;
    onboardingService: unknown;
  }): { element: HTMLElement; open: (trigger?: EventTarget | null) => void; destroy?: () => void };
}

declare module "*.js";
