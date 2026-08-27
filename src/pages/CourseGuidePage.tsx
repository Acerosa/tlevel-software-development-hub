import { Callout } from "@learning-platform/ui";
import { createSitePath } from "../paths";

export function CourseGuidePage({ root }: { root: string }) {
  return (
    <div className="study-stack">
      <section className="study-card" aria-labelledby="structure-heading">
        <h2 id="structure-heading">Course structure</h2>
        <p>
          Follow the 22-week Scheme of Learning for Occupational Specialism Areas 1 to 3.
          Each taught week contains three lessons and homework. Work stays with the Oakfield
          Adult Skills Hub client scenario.
        </p>
        <ul>
          <li>Weeks 1 to 10: analyse the problem, requirements, design, testing and the SDLC</li>
          <li>Weeks 11 to 16: digital team roles, methodologies, UCD and quality requirements</li>
          <li>Weeks 17 to 18: emerging technologies, training, legal duties and sources</li>
          <li>Weeks 19 to 22: revision, a timed case study, and assessment readiness</li>
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
