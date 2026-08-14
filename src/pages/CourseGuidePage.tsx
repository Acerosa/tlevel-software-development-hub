import { Callout } from "@learning-platform/ui";
import { createSitePath } from "../paths";

export function CourseGuidePage({ root }: { root: string }) {
  return (
    <div className="study-stack">
      <section className="study-card" aria-labelledby="structure-heading">
        <h2 id="structure-heading">Course structure</h2>
        <p>Begin with Technical Foundations, then work through Tasks 1, 2 and 3. Projects and assessment practice support this work.</p>
        <ul>
          <li>Technical Foundations</li>
          <li>Task 1</li>
          <li>Task 2</li>
          <li>Task 3</li>
        </ul>
      </section>
      <section className="study-card" aria-labelledby="start-heading">
        <h2 id="start-heading">Start the course</h2>
        <p>Technical Foundations is the current phase.</p>
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
