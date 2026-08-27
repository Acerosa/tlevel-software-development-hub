import {
  CompletionModal,
  InteractiveActivity,
  LoadingState,
  PracticeProgressPanel,
  WeekView,
  questionIdFor,
  type ActivityBlockDocument,
  type ActivityDocument,
  type ActivityResult,
  type ActivityScore
} from "@learning-platform/ui";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import bundledPackage from "../../content/tlevel-software-development/package.json";
import { getContentEngine } from "../content/engine";
import { activeContentPackage } from "../curriculum/apply-runtime";
import { weekPageFromPackage, type ContentPackage } from "../curriculum/from-package";
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

function blockScorableTotal(block: ActivityBlockDocument): number {
  const type = normaliseBlockType(block.type);
  if (type === "single-choice" || type === "option-cards") return 1;
  if (type === "classification") return ((block.content && block.content.items) || []).length;
  return 0;
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

function sumScores(scores: Record<string, ActivityScore>): ActivityScore {
  return Object.values(scores).reduce(
    (total, score) => ({
      correct: total.correct + score.correct,
      total: total.total + score.total
    }),
    { correct: 0, total: 0 }
  );
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

function packageForWeek(pkg: ContentPackage | null | undefined, weekId: string): ContentPackage {
  const bundled = bundledPackage as ContentPackage;
  const live = activeContentPackage(pkg);
  if (live && weekHasCatalogueBlocks(live, weekId)) return live;
  return bundled;
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
  const scoresRef = useRef<Record<string, ActivityScore>>({});
  const [practiceScore, setPracticeScore] = useState<ActivityScore>({ correct: 0, total: 0 });
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

  useEffect(() => {
    scoresRef.current = {};
    dismissedRef.current = false;
    setPracticeScore({ correct: 0, total: 0 });
    setCompletionOpen(false);
  }, [weekId]);

  const recordPracticeResult = useCallback((result: ActivityResult, block: ActivityBlockDocument) => {
    if (!result.completed || !result.score || result.score.total <= 0) return;
    if (!isScorableReactBlock(block)) return;

    scoresRef.current = {
      ...scoresRef.current,
      [questionIdFor(block)]: result.score
    };
    const aggregate = sumScores(scoresRef.current);
    setPracticeScore(aggregate);

    const meaningful = result.score.total >= 2 || Object.keys(scoresRef.current).length >= 2;
    if (meaningful && aggregate.total > 0 && !dismissedRef.current) {
      setCompletionOpen(true);
    }
  }, []);

  const sessions = useMemo(() => {
    if (!model) return [];
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
              initialResponses={draftResponsesFor(activity)}
              renderFallback={(block) => (
                <div dangerouslySetInnerHTML={{ __html: engine.renderBlock(block) }} />
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
  }, [content, model, recordPracticeResult]);

  // Re-bind after every commit. React can rewrite dangerouslySetInnerHTML nodes on a
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

  const weekNumber = model.week.teachingWeek;
  const weekBadge = `Week ${weekNumber}: ${model.week.title}`;
  const summaryScore = {
    correct: practiceScore.correct,
    total: Math.max(scorableTotal, practiceScore.total, 1)
  };
  const coverage = summaryScore.total > 0 ? practiceScore.total / summaryScore.total : 0;
  const practiceComplete = scorableTotal > 0 && practiceScore.total >= scorableTotal;

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
        previousWeek={weekNumber > 1
          ? { label: `Week ${weekNumber - 1}`, href: createSitePath(root, `week-${weekNumber - 1}/`) }
          : null}
        nextWeek={weekNumber < (content.weeks?.length || 0)
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
        message="Check scored activities to update. Formative practice only."
        defaultCollapsed
      />
      <CompletionModal
        open={completionOpen && practiceScore.total > 0}
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
