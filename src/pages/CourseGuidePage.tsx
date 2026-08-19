import { Callout } from "@learning-platform/ui";
import { createSitePath } from "../paths";

export function CourseGuidePage({ root }: { root: string }) {
  return (
    <div className="study-stack">
      <section className="study-card" aria-labelledby="structure-heading">
        <h2 id="structure-heading">Course structure</h2>
        <p>Follow the weekly teaching sequence. Each week contains three lessons and homework.</p>
        <ul>
          <li>Week 1: Introduction to New and Emerging Digital Technologies</li>
          <li>Week 2: Mobile Technology</li>
          <li>Week 3: Internet of Things — Consumer Applications</li>
        </ul>
      </section>
      <section className="study-card" aria-labelledby="start-heading">
        <h2 id="start-heading">Start the course</h2>
        <p>Week 1 is the current teaching week.</p>
        <a className="text-link" href={createSitePath(root, "week-1/")}>Open Week 1</a>
      </section>
      <section className="study-card" aria-labelledby="foundations-heading">
        <h2 id="foundations-heading">Technical Foundations</h2>
        <p>Use Foundations if you need extra practice with programming, requirements, decomposition, data or testing.</p>
        <a className="text-link" href={createSitePath(root, "foundations/")}>Open Foundations</a>
      </section>
      <Callout
        tone="info"
        title="How to use this hub"
        message="Use Course sections beside the page on a larger screen, or the Menu button at the top on a smaller screen."
      />
    </div>
  );
}
