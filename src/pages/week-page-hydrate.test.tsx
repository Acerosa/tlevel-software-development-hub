import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import pkg from "../../content/tlevel-software-development/package.json";
import { type ContentPackage } from "../curriculum/from-package";
import { WeekPage } from "./WeekPage";

function withAvailable(source: ContentPackage, weekId: string): ContentPackage {
  const clone = structuredClone(source);
  for (const week of clone.weeks || []) {
    if (week.id === weekId && week.metadata) week.metadata.status = "available";
  }
  return clone;
}

afterEach(() => {
  cleanup();
});

describe("WeekPage activity-state hydrate loop", () => {
  it("hydrates each week activity a bounded number of times, not once per parent rerender", async () => {
    let hydrates = 0;
    const stores = new Map<string, {
      load: () => { responses: Record<string, unknown>; checked: Record<string, boolean> };
      hydrate: () => Promise<{ responses: Record<string, unknown>; checked: Record<string, boolean> }>;
      save: () => void;
      subscribe: (listener: (state: unknown) => void) => () => void;
      _listener?: (state: unknown) => void;
    }>();
    const hydratesByKey: Record<string, number> = {};
    const platform = {
      auth: {
        isSignedIn: () => true,
        getSession: () => ({ user: { id: "learner-1" } })
      },
      progress: {
        createStore({ activityKey }: { activityKey: string }) {
          const existing = stores.get(activityKey);
          if (existing) return existing;
          const store: {
            load: () => { responses: Record<string, unknown>; checked: Record<string, boolean> };
            hydrate: () => Promise<{ responses: Record<string, unknown>; checked: Record<string, boolean> }>;
            save: () => void;
            subscribe: (listener: (state: unknown) => void) => () => void;
            _listener?: (state: unknown) => void;
          } = {
            load: () => ({ responses: {}, checked: {} }),
            hydrate: async () => {
              hydratesByKey[activityKey] = (hydratesByKey[activityKey] || 0) + 1;
              hydrates += 1;
              return { responses: {}, checked: {} };
            },
            save() {},
            subscribe(listener: (state: unknown) => void) {
              store._listener = listener;
              return () => {};
            }
          };
          stores.set(activityKey, store);
          return store;
        }
      }
    };
    const live = withAvailable(pkg as ContentPackage, "week-1");
    const { rerender } = render(
      <WeekPage weekId="week-1" root="." pkg={live} platform={platform} adaptersReady />
    );
    await waitFor(() => {
      expect(hydrates).toBeGreaterThan(0);
    });
    let previous = hydrates;
    for (let settle = 0; settle < 8; settle += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      if (hydrates === previous) break;
      previous = hydrates;
    }
    const afterMount = hydrates;
    for (let index = 0; index < 40; index += 1) {
      rerender(
        <WeekPage weekId="week-1" root="." pkg={live} platform={platform} adaptersReady />
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(hydrates).toBe(afterMount);
    expect(afterMount).toBeLessThan(200);

    const keys = [...stores.keys()];
    expect(keys.length).toBeGreaterThan(1);
    const target = keys[0];
    const others = keys.slice(1);
    const otherHydrates = others.map((key) => hydratesByKey[key] || 0);
    stores.get(target)?._listener?.({ responses: { remote: "yes" }, checked: {} });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(hydrates).toBe(afterMount);
    for (const [index, key] of others.entries()) {
      expect(hydratesByKey[key] || 0).toBe(otherHydrates[index]);
    }
  });
});
