import { Callout, StatusBadge } from "@learning-platform/ui";
import { createSitePath } from "../paths";

export function HomePage({ root }: { root: string }) {
  return (
    <div className="study-stack">
      <section className="study-card" aria-labelledby="welcome-heading">
        <h2 id="welcome-heading">Welcome</h2>
        <p>Use the course sections to find an area and continue your work.</p>
      </section>
      <section className="study-card" aria-labelledby="guide-heading">
        <h2 id="guide-heading">Course Guide</h2>
        <p>See how the course is organised and what each section is for.</p>
        <a className="text-link" href={createSitePath(root, "course-guide/")}>Open Course Guide</a>
      </section>
      <section className="study-card study-card--current" aria-labelledby="foundations-heading">
        <StatusBadge status="available" label="Current phase" />
        <h2 id="foundations-heading">Technical Foundations</h2>
        <p>Start with the technical knowledge and working practices used throughout the course.</p>
        <a className="text-link" href={createSitePath(root, "foundations/")}>Open Foundations</a>
      </section>
      <section className="study-card" aria-labelledby="projects-heading">
        <h2 id="projects-heading">Projects</h2>
        <p>Find project guidance and evidence tools as they are added.</p>
        <a className="text-link" href={createSitePath(root, "projects/")}>Open Projects</a>
      </section>
      <section className="study-card" aria-labelledby="practice-heading">
        <h2 id="practice-heading">Assessment Practice</h2>
        <p>Use practice materials to prepare for the occupational specialism tasks.</p>
        <a className="text-link" href={createSitePath(root, "assessment-practice/")}>Open Assessment Practice</a>
      </section>
      <Callout
        tone="info"
        title="Occupational specialism"
        message="Begin with Technical Foundations, then work through Tasks 1, 2 and 3. Projects and assessment practice support this work."
      />
    </div>
  );
}
