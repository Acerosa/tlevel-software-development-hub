import { EmptyState } from "@learning-platform/ui";
import { createSitePath } from "../paths";

export function ProjectsPage({ root }: { root: string }) {
  return (
    <section className="study-card" aria-labelledby="projects-heading">
      <h2 id="projects-heading">About this section</h2>
      <p>This section will contain project requirements, source records, AI use records and evidence guidance.</p>
      <p>No project information is collected at this stage.</p>
      <EmptyState
        heading="Project tools are not in this component"
        message="Use Foundations to prepare, then return here when project materials are added."
        action={{ label: "Open Foundations", href: createSitePath(root, "foundations/") }}
      />
      <div className="related-links">
        <a href={createSitePath(root, "foundations/")}>Foundations</a>
        <a href={createSitePath(root, "task-1/")}>Task 1</a>
      </div>
    </section>
  );
}

export function TaskPage({
  root,
  task,
  related
}: {
  root: string;
  task: "1" | "2" | "3";
  related: Array<{ label: string; path: string }>;
}) {
  const ordinal = task === "1" ? "first" : task === "2" ? "second" : "third";
  return (
    <section className="study-card" aria-labelledby="task-heading">
      <h2 id="task-heading">Task materials</h2>
      <p>{`Task ${task} materials will be added in a later component.`}</p>
      <EmptyState
        heading={`Task ${task} workspace`}
        message={`Materials for the ${ordinal} occupational specialism task are not in this hub component yet.`}
      />
      <div className="related-links">
        {related.map((item) => (
          <a key={item.path} href={createSitePath(root, item.path)}>{item.label}</a>
        ))}
      </div>
    </section>
  );
}

export function AssessmentPracticePage({ root }: { root: string }) {
  return (
    <section className="study-card" aria-labelledby="practice-heading">
      <h2 id="practice-heading">Practice materials</h2>
      <p>Questions and activities will be added in a later component.</p>
      <EmptyState
        heading="Assessment practice is not in this component"
        message="Use Resources and Help while practice materials are being prepared."
      />
      <div className="related-links">
        <a href={createSitePath(root, "resources/")}>Resources</a>
        <a href={createSitePath(root, "help/")}>Help</a>
      </div>
    </section>
  );
}

export function ResourcesPage({ root }: { root: string }) {
  return (
    <section className="study-card" aria-labelledby="resources-heading">
      <h2 id="resources-heading">Course resources</h2>
      <p>References, templates and supporting material will be added here.</p>
      <EmptyState
        heading="Resources will be added here"
        message="Course documents and templates are not in this hub component yet."
      />
      <div className="related-links">
        <a href={createSitePath(root, "course-guide/")}>Course Guide</a>
        <a href={createSitePath(root, "help/")}>Help</a>
      </div>
    </section>
  );
}

export function HelpPage() {
  return (
    <div className="study-stack">
      <section className="study-card" aria-labelledby="navigation-heading">
        <h2 id="navigation-heading">Finding a section</h2>
        <p>On a computer, use the Course sections menu beside the page. On a smaller screen, open the Menu button at the top.</p>
      </section>
      <section className="study-card" aria-labelledby="keyboard-heading">
        <h2 id="keyboard-heading">Keyboard access</h2>
        <p>Press Tab to move through links and controls. Use the skip link to move directly to the main content.</p>
      </section>
    </div>
  );
}
