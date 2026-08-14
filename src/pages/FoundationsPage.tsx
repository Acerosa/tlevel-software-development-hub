import { useEffect, useState } from "react";
import { ActivityCard, Callout, LoadingState, ProgressCard } from "@learning-platform/ui";
import type { FoundationActivityProgress, FoundationActivityRecord } from "../globals";
import { createSitePath } from "../paths";

type RemoteProgress = {
  activities: Array<{ activity_key: string; activity_version: string; latest_score: number; max_score: number }>;
  assignments: Array<{ activity_key: string; activity_version: string }>;
};

function localSummary(activity: FoundationActivityRecord): FoundationActivityProgress {
  return window.FoundationActivityState?.getSummary(activity.id, activity.version) || {
    status: "not-started",
    label: "Not started",
    action: "Start activity"
  };
}

function remoteSummary(
  activity: FoundationActivityRecord,
  remoteProgress: RemoteProgress | null
): FoundationActivityProgress | null {
  if (!remoteProgress) return null;
  const progress = remoteProgress.activities.find((item) => (
    item.activity_key === activity.id && item.activity_version === activity.version
  ));
  if (progress) {
    return {
      status: "completed",
      label: "Completed, " + progress.latest_score + "/" + progress.max_score,
      action: "Revisit activity",
      percentage: progress.max_score > 0
        ? Math.round((Number(progress.latest_score) / Number(progress.max_score)) * 100)
        : 0
    };
  }
  const assigned = remoteProgress.assignments.some((item) => (
    item.activity_key === activity.id && item.activity_version === activity.version
  ));
  return assigned ? { status: "not-started", label: "Assigned", action: "Start activity" } : null;
}

export function FoundationsPage({ root, adaptersReady }: { root: string; adaptersReady: boolean }) {
  const [catalog, setCatalog] = useState<FoundationActivityRecord[]>([]);
  const [summaries, setSummaries] = useState<FoundationActivityProgress[]>([]);

  useEffect(() => {
    if (!adaptersReady) return;
    let cancelled = false;
    void (async () => {
      await import("../../js/activities/activity-state.js");
      await import("../../js/data/foundations/catalog.js");
      if (cancelled) return;
      const items = [...(window.FoundationActivityCatalog || [])];
      setCatalog(items);
      setSummaries(items.map(localSummary));

      if (!window.StudentContext?.isSignedIn() || !window.SupabaseAnalytics) return;
      try {
        const remote = await window.SupabaseAnalytics.studentProgress();
        if (cancelled) return;
        setSummaries(items.map((activity) => remoteSummary(activity, remote) || localSummary(activity)));
      } catch {
        if (!cancelled) setSummaries(items.map(localSummary));
      }
    })();
    return () => { cancelled = true; };
  }, [adaptersReady]);

  return (
    <>
      <section className="study-card study-card--current foundations-introduction" aria-labelledby="foundations-heading">
        <span className="card-label">Current phase</span>
        <h2 id="foundations-heading">Prepare for later course work</h2>
        <p>These formative activities prepare you to analyse problems, design solutions, develop software and test your work. They are not official Pearson assessment material and do not produce a qualification grade.</p>
        <p>You can work without signing in. Browser progress remains local. If you sign in, a completed score is also saved to your learning record. These formative results are not assessment evidence.</p>
      </section>
      <Callout
        tone="info"
        title="Programming languages"
        message="The Programming Diagnostic lets you choose Python, JavaScript or C#. Later coding work in this hub keeps that language choice."
      />
      <ProgressCard
        title="Foundations progress"
        completed={summaries.filter((item) => item.status === "completed").length}
        total={catalog.length}
        description="Completed scores from this browser and your signed-in learning record."
      />
      <div className="activity-grid" data-foundations-catalog="" aria-live="polite">
        {!adaptersReady || catalog.length === 0 ? (
          <LoadingState message="Loading Foundations activities..." />
        ) : catalog.map((activity, index) => {
          const summary = summaries[index] || localSummary(activity);
          return (
            <div className="foundations-activity" key={activity.id}>
              <ActivityCard
                title={activity.title}
                description={activity.purpose}
                activityType={activity.type}
                duration={activity.detail}
                status={summary.label}
                badge
                badgeStatus={summary.status}
                href={activity.path.startsWith("./")
                  ? createSitePath(root, `foundations/${activity.path.slice(2)}`)
                  : activity.path}
                actionLabel={summary.action}
              />
              <h3 className="activity-card__topics-title">Topics covered</h3>
              <ul className="activity-card__topics">
                {activity.topics.map((topic) => <li key={topic}>{topic}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
