type ContentBlock = {
  id?: string;
  type?: string;
  content?: Record<string, unknown>;
};

type ContentActivity = {
  id: string;
  version: string;
  metadata?: {
    title?: string;
    summary?: string;
    activityType?: string;
    detail?: string;
    topics?: string[];
    href?: string | null;
    estimatedDurationMinutes?: number;
    status?: string;
  };
  blocks?: ContentBlock[];
};

type ContentWeek = {
  id: string;
  metadata?: {
    teachingWeek?: number;
    title?: string;
    status?: string;
    professionalPractice?: string;
    weekCommencing?: string;
  };
  relationships?: {
    sessions?: string[];
    learningOutcomes?: string[];
  };
};

type ContentSession = {
  id: string;
  metadata?: {
    title?: string;
    kind?: string;
    summary?: string;
    defaultOpen?: boolean;
  };
  relationships?: {
    activities?: string[];
    week?: string;
  };
};

type ContentOutcome = {
  id: string;
  metadata?: { title?: string };
};

export type ContentPackage = {
  version?: string;
  hub?: { id?: string };
  curriculum?: { metadata?: { course?: string; title?: string } };
  weeks?: ContentWeek[];
  sessions?: ContentSession[];
  activities?: ContentActivity[];
  learningOutcomes?: ContentOutcome[];
};

export type HomeWeekCard = {
  id: string;
  teachingWeek: number;
  label: string;
  title: string;
  description: string;
  path: string;
  status: string;
  weekCommencing: string;
  weekCommencingLabel: string;
  openable: boolean;
  current: boolean;
};

export type WeekPageModel = {
  week: {
    id: string;
    teachingWeek: number;
    title: string;
    subtitle: string;
    status: string;
    weekCommencing: string;
  };
  learningOutcomes: Array<{ id: string; title: string }>;
  sessions: Array<{
    id: string;
    title: string;
    kind: string;
    summary: string;
    defaultOpen: boolean;
    activities: Array<{
      id: string;
      title: string;
      description: string;
      activityType: string;
      duration: string;
      status: string;
      badge: boolean;
      badgeStatus: string;
      headingLevel: 3;
    }>;
  }>;
};

function learnerWeekDescription(practice?: string) {
  const trimmed = String(practice || "").replace(/^LO\d(?:\s*\/\s*[^—–-]+)?\s*[—–-]\s*/i, "").trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : "";
}

/** Learners may open a week only when Content `STATUSES` is `available`. */
export function isWeekAvailable(status?: string | null): boolean {
  return String(status || "").trim().toLowerCase() === "available";
}

/**
 * Keep bundled week catalogue/structure; overlay live publication status
 * (and week commencing) so a thin published package cannot blank Home/Week lists.
 * Match live weeks by id first, then by `metadata.teachingWeek`.
 */
function teachingWeekNumber(week: ContentWeek): number | null {
  const n = Number(week.metadata?.teachingWeek);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function overlayLiveWeekMetadata(base: ContentPackage, live: ContentPackage | null | undefined): ContentPackage {
  if (!live?.weeks?.length) return base;
  const liveById = new Map<string, ContentWeek["metadata"]>();
  const liveByTeachingWeek = new Map<number, ContentWeek["metadata"]>();
  for (const week of live.weeks) {
    if (week.id) liveById.set(week.id, week.metadata);
    const n = teachingWeekNumber(week);
    if (n != null && !liveByTeachingWeek.has(n)) liveByTeachingWeek.set(n, week.metadata);
  }
  return {
    ...base,
    weeks: (base.weeks || []).map((week) => {
      const n = teachingWeekNumber(week);
      const liveMeta = (week.id ? liveById.get(week.id) : undefined)
        || (n != null ? liveByTeachingWeek.get(n) : undefined);
      if (!liveMeta) return week;
      const liveStatus = liveMeta.status == null ? "" : String(liveMeta.status).trim();
      return {
        ...week,
        metadata: {
          ...week.metadata,
          status: liveStatus || week.metadata?.status,
          weekCommencing: liveMeta.weekCommencing ?? week.metadata?.weekCommencing
        }
      };
    })
  };
}

export function formatWeekCommencing(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return raw;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
}

export function homeWeeksFromPackage(pkg: ContentPackage): HomeWeekCard[] {
  const weeks = [...(pkg.weeks || [])]
    .map((week) => {
      const teachingWeek = Number(week.metadata?.teachingWeek || 0);
      const status = String(week.metadata?.status || "");
      const weekCommencing = String(week.metadata?.weekCommencing || "");
      return {
        id: week.id,
        teachingWeek,
        label: `Week ${teachingWeek}`,
        title: week.metadata?.title || `Week ${teachingWeek}`,
        description: learnerWeekDescription(week.metadata?.professionalPractice),
        path: `week-${teachingWeek}/`,
        status,
        weekCommencing,
        weekCommencingLabel: formatWeekCommencing(weekCommencing),
        openable: isWeekAvailable(status),
        current: false
      };
    })
    .sort((left, right) => left.teachingWeek - right.teachingWeek);
  const currentWeek = weeks.find((week) => week.openable)?.teachingWeek;
  return weeks.map((week) => ({
    ...week,
    current: currentWeek != null && week.teachingWeek === currentWeek
  }));
}

/** Bundled week structure with live publication status when a published package is present. */
export function weeksFromPublication(
  bundled: ContentPackage,
  live?: ContentPackage | null
): HomeWeekCard[] {
  return homeWeeksFromPackage(overlayLiveWeekMetadata(bundled, live));
}

export function weekPageFromPackage(pkg: ContentPackage, weekId: string): WeekPageModel | null {
  const week = (pkg.weeks || []).find((item) => item.id === weekId);
  if (!week) return null;
  const teachingWeek = Number(week.metadata?.teachingWeek || 0);
  const sessions = (week.relationships?.sessions || []).map((sessionId) => {
    const session = (pkg.sessions || []).find((item) => item.id === sessionId);
    return {
      id: sessionId,
      title: session?.metadata?.title || sessionId,
      kind: session?.metadata?.kind || "session",
      summary: session?.metadata?.summary || "",
      defaultOpen: session?.metadata?.defaultOpen === true,
      activities: (session?.relationships?.activities || []).map((activityId) => {
        const activity = (pkg.activities || []).find((item) => item.id === activityId);
        const minutes = activity?.metadata?.estimatedDurationMinutes;
        return {
          id: activityId,
          title: activity?.metadata?.title || activityId,
          description: activity?.metadata?.summary || "",
          activityType: activity?.metadata?.activityType || "Activity",
          duration: minutes ? `${minutes} minutes` : "",
          status: "Available",
          badge: true,
          badgeStatus: activity?.metadata?.status || "available",
          headingLevel: 3 as const
        };
      })
    };
  });
  const learningOutcomes = (week.relationships?.learningOutcomes || []).map((outcomeId) => {
    const outcome = (pkg.learningOutcomes || []).find((item) => item.id === outcomeId);
    return { id: outcomeId, title: outcome?.metadata?.title || outcomeId };
  });
  return {
    week: {
      id: week.id,
      teachingWeek,
      title: week.metadata?.title || `Week ${teachingWeek}`,
      subtitle: learnerWeekDescription(week.metadata?.professionalPractice),
      status: week.metadata?.status || "",
      weekCommencing: week.metadata?.weekCommencing || ""
    },
    learningOutcomes,
    sessions
  };
}

type RestoredQuestion = Record<string, unknown> & { id: string; type: string; prompt: string };

function parseRemainder(activity: ContentActivity): Record<string, unknown> {
  const remainder = (activity.blocks || []).find((item) => item.id === `${activity.id}-source-remainder`);
  const text = String(remainder?.content?.text || "");
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function activityFromPackage(pkg: ContentPackage, activityId: string): Record<string, unknown> | null {
  const activity = (pkg.activities || []).find((item) => item.id === activityId);
  if (!activity) return null;
  const remainder = parseRemainder(activity);
  const restored: Record<string, unknown> = {
    id: activity.id,
    activityId: activity.id,
    version: activity.version,
    title: activity.metadata?.title,
    ...remainder
  };
  const sections: Array<{ id: string; title: string; intro: string; questions: RestoredQuestion[] }> = [];
  let current: { id: string; title: string; intro: string; questions: RestoredQuestion[] } | null = null;
  const questions: RestoredQuestion[] = [];

  (activity.blocks || []).forEach((item) => {
    if (item.id?.endsWith("-source-remainder")) return;
    const content = (item.content || {}) as Record<string, unknown>;
    if (item.type === "heading" && content.level === 3) {
      current = {
        id: String(item.id || "").replace(`${activity.id}-`, "").replace(/-h$/, ""),
        title: String(content.text || ""),
        intro: "",
        questions: []
      };
      sections.push(current);
      return;
    }
    if (item.type === "paragraph" && current && !current.intro) {
      current.intro = String(content.text || "");
      return;
    }
    if (!content.questionId && item.type !== "classification") return;
    if (content.sourceQuestionId === "learner-note") return;
    const question: RestoredQuestion = {
      id: String(content.sourceQuestionId || String(content.questionId || item.id).split(":").pop()),
      type: String(content.sourceType || item.type || "single"),
      prompt: String(content.prompt || ""),
      options: content.options,
      rows: content.rows,
      items: content.items,
      answer: content.answer || content.correctOptionId,
      answers: content.answers,
      accepted: content.accepted,
      feedback: content.feedback,
      skill: content.skill,
      languages: content.languages,
      commandWord: content.commandWord,
      marks: content.marks,
      scenario: content.scenario,
      explanation: (content.feedback as { correct?: string } | undefined)?.correct,
      correctOptionId: content.correctOptionId,
      ...content
    };
    if (item.type === "classification" && content.sourceType !== "matching") {
      restored.cards = ((content.items as Array<Record<string, unknown>>) || []).map((card) => ({
        id: card.id,
        text: card.text,
        correctType: card.correctCategoryId,
        explanation: card.explanation,
        ambiguityNote: card.ambiguityNote,
        exploitPair: card.exploitPair
      }));
      return;
    }
    if (content.sourceType === "matching") {
      question.type = "matching";
      question.options = content.options;
      question.rows = content.rows;
      question.answer = content.answer;
    }
    if (current) current.questions.push(question);
    else questions.push(question);
  });

  if (sections.length) restored.sections = sections;
  if (questions.length) restored.questions = questions;
  return restored;
}

export function catalogFromPackage(pkg: ContentPackage) {
  return (pkg.activities || [])
    .filter((activity) => activity.id.startsWith("foundations-"))
    .map((activity) => ({
    id: activity.id,
    version: activity.version,
    title: activity.metadata?.title || activity.id,
    purpose: activity.metadata?.summary || "",
    type: activity.metadata?.activityType || "Activity",
    detail: activity.metadata?.detail || "",
    topics: activity.metadata?.topics || [],
    path: activity.metadata?.href || `./${activity.id.replace(/^foundations-/, "")}/`
  }));
}
