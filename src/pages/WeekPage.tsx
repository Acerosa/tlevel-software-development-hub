import { LoadingState, WeekView } from "@learning-platform/ui";
import pkg from "../../content/tlevel-software-development/package.json";
import { weekPageFromPackage } from "../curriculum/from-package";
import { createSitePath } from "../paths";

export function WeekPage({ weekId, root }: { weekId: string; root: string }) {
  const model = weekPageFromPackage(pkg, weekId);
  if (!model) {
    return <LoadingState message="This week has not been published yet." />;
  }

  const weekNumber = model.week.teachingWeek;
  return (
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
        description: "Formative learning for Exploring New and Emerging Digital Technologies. This is not a Pearson assessment.",
        items: [
          { label: "Qualification", value: "T Level Digital" },
          { label: "Unit", value: "Exploring New and Emerging Digital Technologies" },
          { label: "Week", value: `Week ${weekNumber}: ${model.week.title}` }
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
      nextWeek={weekNumber < 3
        ? { label: `Week ${weekNumber + 1}`, href: createSitePath(root, `week-${weekNumber + 1}/`) }
        : null}
      sessions={model.sessions}
    />
  );
}
