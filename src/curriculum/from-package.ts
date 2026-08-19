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
  };
  blocks?: ContentBlock[];
};

export type ContentPackage = {
  version?: string;
  hub?: { id?: string };
  curriculum?: { metadata?: { course?: string; title?: string } };
  weeks?: Array<{ id: string }>;
  sessions?: Array<{ id: string; relationships?: { activities?: string[] } }>;
  activities?: ContentActivity[];
};

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
