/** True when a hydrated Foundations activity still carries answer keys needed for local marking. */
export function foundationsActivityHasMarkingKeys(
  activity: Record<string, unknown> | null | undefined
): boolean {
  if (!activity) return false;

  const sectionQuestions = Array.isArray(activity.sections)
    ? activity.sections.flatMap((section) => {
        const questions = (section as { questions?: unknown }).questions;
        return Array.isArray(questions) ? questions : [];
      })
    : [];
  const topLevel = Array.isArray(activity.questions) ? activity.questions : [];
  const questions = [...sectionQuestions, ...topLevel] as Array<Record<string, unknown>>;
  if (!questions.length) return false;

  return questions.every((question) => {
    if (question.languages && typeof question.languages === "object") return true;
    if (question.rules && typeof question.rules === "object") return true;
    if (Array.isArray(question.answers) && question.answers.length > 0) return true;
    if (Array.isArray(question.accepted) && question.accepted.length > 0) return true;
    if (question.answer != null && question.answer !== "") return true;
    const correctOptionId = String(question.correctOptionId || "").trim();
    return Boolean(correctOptionId);
  });
}
