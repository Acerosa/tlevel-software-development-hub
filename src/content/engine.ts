import "./bind-core";
import "@learning-platform/content";
import "../../content/engine/version.js";
import "../../content/engine/state.js";
import "../../content/engine/publication.js";
import "../../content/engine/submit.js";
import "../../content/engine/interactive.js";
import { APP_CONFIG } from "../config";

export type ContentEngine = {
  renderActivity: (activity: unknown, options?: { root?: string }) => string;
  renderBlock: (block: unknown, options?: { root?: string }) => string;
  bindInteractive: (
    root: ParentNode | null,
    pkg: unknown,
    options?: {
      sourcePage?: string;
      storage?: Storage;
      learnerKey?: string;
      platform?: unknown;
    }
  ) => void;
  validatePackage: (pkg: unknown) => { valid: boolean; issues?: unknown[] };
  formatIssues: (issues: unknown) => string;
  loadCurriculumRuntime: (options: {
    appConfig: unknown;
    config: unknown;
    session?: unknown;
    fetch?: (input: unknown, init?: unknown) => Promise<{ ok: boolean; json?: () => Promise<unknown> }>;
    loadBundled: () => Promise<unknown> | unknown;
    validate: (pkg: unknown) => { valid: boolean; issues?: unknown[] };
    storage?: { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void; removeItem: (key: string) => void };
  }) => Promise<{
    source: "published" | "cache" | "bundled";
    package: unknown;
    state: { state?: string; allowsSubmission?: boolean; message?: string };
    publication: unknown;
  }>;
  setPublicationState?: (state: unknown) => unknown;
  getPublicationState?: () => { state?: string; allowsSubmission?: boolean } | null;
  renderPublicationStatus: (state: unknown) => string;
  submitActivityDraft: (
    activity: unknown,
    draft: unknown,
    options?: {
      platform?: unknown;
      publication?: unknown;
      sourcePage?: string;
    }
  ) => Promise<{ status: string; reason?: string; failed?: boolean; fingerprint?: string }>;
  serialiseActivityResult: (activity: unknown, draft: unknown) => unknown;
  createMemoryStorage?: () => Storage;
  createDraftStore?: (
    activity: { id: string; version?: string },
    options?: { storage?: Storage; learnerKey?: string }
  ) => {
    load: () => { responses: Record<string, unknown>; activityId: string; submission?: { status?: string; failed?: boolean; reason?: string } };
    save: (draft: unknown) => unknown;
  };
  migrateGuestDrafts?: (options?: { storage?: Storage; learnerKey?: string }) => {
    migrated: number;
    skipped: number;
    reason: string;
  };
};

export function getContentEngine(): ContentEngine {
  const engine = (globalThis as { LearningPlatformContent?: ContentEngine }).LearningPlatformContent;
  if (!engine) throw new Error("LEARNING_PLATFORM_CONTENT_UNAVAILABLE");
  return engine;
}

export function packagePathFromBody(body: HTMLElement): string {
  const root = body.dataset.root || ".";
  return `${root.replace(/\/?$/, "/")}${APP_CONFIG.curriculumPackage}`;
}
