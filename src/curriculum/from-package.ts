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
  current: boolean;
};

export type WeekPageModel = {
  week: {
    id: string;
    teachingWeek: number;
    title: string;
    subtitle: string;
    status: string;
  };
  learningOutcomes: Array<{ id: string; title: string }>;
  sessions: Array<{
    id: string;
    title: string;
    kind: string;
    summary: string;
    defaultOpen: boolean;
    activities: Array<{
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
  const trimmed = String(practice || "").replace(/^LO\d(?:\s*\/\s*AC[\s\d.]+)?\s*[—–-]\s*/i, "").trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : "";
}

export function homeWeeksFromPackage(pkg: ContentPackage): HomeWeekCard[] {
  return [...(pkg.weeks || [])]
    .map((week) => {
      const teachingWeek = Number(week.metadata?.teachingWeek || 0);
      return {
        id: week.id,
        teachingWeek,
        label: `Week ${teachingWeek}`,
        title: week.metadata?.title || `Week ${teachingWeek}`,
        description: learnerWeekDescription(week.metadata?.professionalPractice),
        path: `week-${teachingWeek}/`,
        current: teachingWeek === 1
      };
    })
    .sort((left, right) => left.teachingWeek - right.teachingWeek);
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
      status: week.metadata?.status || "available"
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
