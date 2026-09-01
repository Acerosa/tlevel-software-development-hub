import {
  CompletionModal,
  EmptyState,
  InteractiveActivity,
  LoadingState,
  PracticeProgressPanel,
  WeekView,
  AuthoredHtml,
  aggregatePracticeProgress,
  applyPracticeResult,
  emptyPracticeProgress,
  isCatalogueReactType,
  isPracticeCompletionCue,
  questionIdFor,
  type ActivityBlockDocument,
  type ActivityDocument,
  type ActivityResult,
  type PracticeProgressAggregate
} from "@learning-platform/ui";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import bundledPackage from "../../content/tlevel-software-development/package.json";
import { getContentEngine } from "../content/engine";
import {
  formatWeekCommencing,
  isWeekAvailable,
  overlayLiveWeekMetadata,
  weekPageFromPackage,
  type ContentPackage
} from "../curriculum/from-package";
import { createSitePath } from "../paths";

function normaliseBlockType(value: string | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function persistableResponse(block: ActivityBlockDocument, result: ActivityResult): unknown {
  const type = normaliseBlockType(block.type);
  const responses = result.responses;
  if (type === "single-choice" || type === "option-cards") {
    if (responses && typeof responses === "object" && !Array.isArray(responses) && "optionId" in responses) {
      const optionId = (responses as { optionId?: string | null }).optionId;
      return optionId == null ? "" : optionId;
    }
    return responses == null ? "" : responses;
  }
  if (type === "short-response" || type === "reflection") {
    if (typeof responses === "string") return responses.trim();
    if (responses == null) return "";
    return String(responses).trim();
  }
  return responses && typeof responses === "object" ? responses : {};
}

function isScorableReactBlock(block: ActivityBlockDocument): boolean {
  const type = normaliseBlockType(block.type);
  return type === "single-choice" || type === "option-cards" || type === "classification";
}

function isCompletableReactBlock(block: ActivityBlockDocument): boolean {
  return isCatalogueReactType(block.type);
}

function blockScorableTotal(block: ActivityBlockDocument): number {
  const type = normaliseBlockType(block.type);
  if (type === "single-choice" || type === "option-cards") return 1;
  if (type === "classification") return ((block.content && block.content.items) || []).length;
  return 0;
}

function weekRequiredTotal(content: ContentPackage, weekId: string): number {
  const model = weekPageFromPackage(content, weekId);
  if (!model) return 0;
  let total = 0;
  for (const session of model.sessions) {
    for (const item of session.activities) {
      const activity = content.activities?.find((entry) => entry.id === item.id) as ActivityDocument | undefined;
      for (const block of activity?.blocks || []) {
        if (isCompletableReactBlock(block as ActivityBlockDocument)) total += 1;
      }
    }
  }
  return total;
}

function weekScorableTotal(content: ContentPackage, weekId: string): number {
  const model = weekPageFromPackage(content, weekId);
  if (!model) return 0;
  let total = 0;
  for (const session of model.sessions) {
    for (const item of session.activities) {
      const activity = content.activities?.find((entry) => entry.id === item.id) as ActivityDocument | undefined;
      for (const block of activity?.blocks || []) {
        total += blockScorableTotal(block as ActivityBlockDocument);
      }
    }
  }
  return total;
}

function draftResponsesFor(activity: ActivityDocument): Record<string, unknown> {
  const engine = getContentEngine();
  if (!engine.createDraftStore) return {};
  try {
    const draft = engine.createDraftStore(activity).load();
    return draft?.responses && typeof draft.responses === "object" ? draft.responses : {};
  } catch {
    return {};
  }
}

function packageForWeek(live: ContentPackage | null | undefined, weekId: string): ContentPackage {
  const bundled = bundledPackage as ContentPackage;
  const useLiveActivities = Boolean(live && weekHasCatalogueBlocks(live, weekId));
  const teaching = useLiveActivities
    ? {
        ...bundled,
        activities: live?.activities?.length ? live.activities : bundled.activities,
        sessions: live?.sessions?.length ? live.sessions : bundled.sessions
      }
    : bundled;
  return overlayLiveWeekMetadata(teaching, live);
}

function weekOpenable(content: ContentPackage, teachingWeek: number): boolean {
  const week = content.weeks?.find((item) => Number(item.metadata?.teachingWeek) === teachingWeek);
  return isWeekAvailable(week?.metadata?.status);
}

function notReleasedCopy(status: string, weekCommencing: string) {
  if (status === "archived") {
    return {
      heading: "This week is archived",
      message: "This week is no longer available. Check course home for weeks you can open."
    };
  }
  const when = formatWeekCommencing(weekCommencing);
  return {
    heading: "Coming soon",
    message: when
      ? `This week is not available yet. Teaching is planned to commence ${when}.`
      : "This week is not available yet. Check back when your tutor posts it."
  };
}

function weekHasCatalogueBlocks(content: ContentPackage, weekId: string): boolean {
  const model = weekPageFromPackage(content, weekId);
  if (!model) return false;
  for (const session of model.sessions) {
    for (const item of session.activities) {
      const activity = content.activities?.find((entry) => entry.id === item.id);
      if ((activity?.blocks || []).some((block) => {
        const type = String(block.type || "");
        return type === "single-choice" || type === "classification" || type === "short-response";
      })) {
        return true;
      }
    }
  }
  return false;
}

export function WeekPage({
  weekId,
  root,
  pkg,
  platform
}: {
  weekId: string;
  root: string;
  pkg?: ContentPackage | null;
  platform?: unknown;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const dismissedRef = useRef(false);
  const progressRef = useRef(emptyPracticeProgress());
  const [practice, setPractice] = useState<PracticeProgressAggregate>(
    aggregatePracticeProgress(emptyPracticeProgress(), { requiredBlocks: 0, scorableTotal: 0 })
  );
  const [completionOpen, setCompletionOpen] = useState(false);
  const content = packageForWeek(pkg, weekId);
  const model = useMemo(
    () => weekPageFromPackage(content, weekId),
    [content, weekId]
  );
  const scorableTotal = useMemo(
    () => weekScorableTotal(content, weekId),
    [content, weekId]
  );
  const requiredTotal = useMemo(
    () => weekRequiredTotal(content, weekId),
    [content, weekId]
  );

  useEffect(() => {
    progressRef.current = emptyPracticeProgress();
    dismissedRef.current = false;
    setPractice(aggregatePracticeProgress(emptyPracticeProgress(), {
      requiredBlocks: requiredTotal,
      scorableTotal
    }));
    setCompletionOpen(false);
  }, [weekId, requiredTotal, scorableTotal]);

  const recordPracticeResult = useCallback((result: ActivityResult, block: ActivityBlockDocument) => {
    if (!result.completed) return;
    if (!isCompletableReactBlock(block) && !isScorableReactBlock(block)) return;

    progressRef.current = applyPracticeResult(progressRef.current, questionIdFor(block), result);
    const aggregate = aggregatePracticeProgress(progressRef.current, {
      requiredBlocks: requiredTotal,
      scorableTotal
    });
    setPractice(aggregate);

    if (isPracticeCompletionCue(result, aggregate) && !dismissedRef.current) {
      setCompletionOpen(true);
    }
  }, [requiredTotal, scorableTotal]);

  const released = isWeekAvailable(model?.week.status);

  const sessions = useMemo(() => {
    if (!model || !isWeekAvailable(model.week.status)) return [];
    const engine = getContentEngine();
    return model.sessions.map((session) => ({
      ...session,
      activities: session.activities.map((item) => {
        const activity = content.activities?.find((entry) => entry.id === item.id) as ActivityDocument | undefined;
        if (!activity) return { html: "" };
        return {
          children: (
            <InteractiveActivity
              activity={activity}
              platform={platform}
              initialResponses={draftResponsesFor(activity)}
              renderFallback={(block) => (
                <AuthoredHtml html={engine.renderBlock(block)} />
              )}
              onResult={(result: ActivityResult, block: ActivityBlockDocument) => {
                const article = mountRef.current?.querySelector(`[data-lp-activity="${activity.id}"]`);
                article?.dispatchEvent(new CustomEvent("lp-block-result", {
                  bubbles: true,
                  detail: {
                    questionId: questionIdFor(block),
                    response: persistableResponse(block, result),
                    completed: result.completed
                  }
                }));
                recordPracticeResult(result, block);
              }}
            />
          )
        };
      })
    }));
  }, [content, model, platform, recordPracticeResult]);

  // Re-bind after every commit. React can rewrite authored HTML nodes on a
  // later render and wipe data-lp-bound / listeners without changing sessions identity.
  useLayoutEffect(() => {
    const rootEl = mountRef.current;
    if (!rootEl || !sessions.length) return;

    getContentEngine().bindInteractive(rootEl, content, {
      sourcePage: window.location.pathname,
      platform: platform || (typeof window !== "undefined" ? window.LearningPlatform?.platform : undefined)
    });
  });

  if (!model) {
    return <LoadingState message="This week has not been published yet." />;
  }

  if (!released) {
    const copy = notReleasedCopy(model.week.status, model.week.weekCommencing);
    return (
      <div data-lp-week-page="" data-lp-week-locked={model.week.status || "planned"}>
        <EmptyState
          heading={copy.heading}
          message={copy.message}
          action={{ label: "Back to course home", href: createSitePath(root) }}
        />
      </div>
    );
  }

  const weekNumber = model.week.teachingWeek;
  const weekBadge = `Week ${weekNumber}: ${model.week.title}`;
  const summaryScore = scorableTotal > 0 ? {
    correct: practice.score.correct,
    total: Math.max(scorableTotal, practice.score.total, 1)
  } : undefined;
  const coverage = practice.completion;
  const practiceComplete = practice.complete;

  function closeCompletion() {
    dismissedRef.current = true;
    setCompletionOpen(false);
  }

  return (
    <div data-lp-mount="" data-lp-week-page="" ref={mountRef}>
      <WeekView
        week={{
          id: model.week.id,
          teachingWeek: weekNumber,
          title: model.week.title,
          subtitle: model.week.subtitle,
          status: model.week.status
        }}
        learningOutcomes={model.learningOutcomes}
        context={{
          type: "assignment",
          contextType: "assignment",
          heading: "Teaching context",
          description: "Formative learning for Occupational Specialism Areas 1 to 3. This is not a Pearson assessment.",
          items: [
            { label: "Qualification", value: "T Level Digital Software Development" },
            { label: "Content", value: "Occupational Specialism Areas 1 to 3 (1.1 to 3.2)" },
            { label: "Week", value: weekBadge }
          ]
        }}
        features={{
          showTitle: false,
          showAssignmentContext: true,
          showProjectContext: false,
          showExamContext: false
        }}
        previousWeek={weekNumber > 1 && weekOpenable(content, weekNumber - 1)
          ? { label: `Week ${weekNumber - 1}`, href: createSitePath(root, `week-${weekNumber - 1}/`) }
          : null}
        nextWeek={weekOpenable(content, weekNumber + 1)
          ? { label: `Week ${weekNumber + 1}`, href: createSitePath(root, `week-${weekNumber + 1}/`) }
          : null}
        sessions={sessions}
      />
      <PracticeProgressPanel
        title="Practice progress"
        badge={weekBadge}
        score={summaryScore}
        progress={coverage}
        completed={practiceComplete}
        message="Check items to update progress. Scores update only when the server returns a mark. Formative practice only."
        defaultCollapsed
      />
      <CompletionModal
        open={completionOpen && practice.completedCount > 0}
        title="Practice complete"
        badge={weekBadge}
        score={summaryScore}
        progress={coverage}
        message="Keep practising. This score is formative feedback for this week, not Pearson assessment evidence."
        onClose={closeCompletion}
        onNext={closeCompletion}
        nextLabel="Continue"
      />
    </div>
  );
}

/** Exported for focused tests — mirrors the WeekPage draft payload mapping. */
export { persistableResponse };
