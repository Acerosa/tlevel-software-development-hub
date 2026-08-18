import { APP_CONFIG } from "./config";
import { SUPABASE_CONFIG } from "./supabase-config";

declare global {
  interface Window {
    APP_CONFIG: typeof APP_CONFIG;
    SUPABASE_CONFIG: typeof SUPABASE_CONFIG;
    LearningPlatform?: {
      platform: {
        curriculum?: {
          loadLatest: () => Promise<unknown>;
          renderStatus?: (state: unknown) => string;
        };
      };
      coreVersion: string;
      ready?: Promise<unknown>;
    };
    __lpPackage?: unknown;
    __lpPublishedCurriculum?: boolean;
    FoundationActivityCatalog?: FoundationActivityRecord[];
    FoundationActivityData?: Record<string, unknown>;
    FoundationActivityState?: {
      getSummary: (activityId: string, version?: string) => FoundationActivityProgress;
    };
    FoundationActivityEngine?: { initialise: () => void };
    StudentContext?: {
      isSignedIn: () => boolean;
      subscribe: (listener: (student: unknown) => void) => () => void;
    };
    SupabaseAnalytics?: {
      studentProgress: () => Promise<{
        activities: Array<{ activity_key: string; activity_version: string; latest_score: number; max_score: number }>;
        assignments: Array<{ activity_key: string; activity_version: string }>;
      }>;
    };
  }
}

export type FoundationActivityRecord = {
  id: string;
  version: string;
  title: string;
  purpose: string;
  type: string;
  detail: string;
  topics: string[];
  path: string;
};

export type FoundationActivityProgress = {
  status: string;
  label: string;
  action: string;
  percentage?: number;
};

window.APP_CONFIG = APP_CONFIG;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
