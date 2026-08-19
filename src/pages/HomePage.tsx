import { Callout, StatusBadge } from "@learning-platform/ui";
import pkg from "../../content/tlevel-software-development/package.json";
import { homeWeeksFromPackage } from "../curriculum/from-package";
import { createSitePath } from "../paths";

const WEEKS = homeWeeksFromPackage(pkg);

export function HomePage({ root }: { root: string }) {
  return (
    <div className="study-stack">
      <section className="study-card" aria-labelledby="welcome-heading">
        <h2 id="welcome-heading">Welcome</h2>
        <p>
          This hub brings together weekly lesson resources and formative activities for
          Exploring New and Emerging Digital Technologies.
        </p>
        <p>
          Start with the current week’s overview. Lessons, retrieval, application tasks and
          homework for that week are listed there so you can follow the teaching sequence
          without hunting across the site.
        </p>
      </section>

      <section aria-labelledby="start-heading">
        <h2 id="start-heading">Where to start</h2>
        <div className="home-week-scroller" tabIndex={0} aria-label="Week cards">
          <div className="card-grid">
            {WEEKS.map((week) => (
              <article className="hub-card" key={week.id}>
                <StatusBadge
                  status="available"
                  label={week.current ? "Active" : "Available"}
                />
                <h3>{week.label}</h3>
                <p>{`${week.title}. ${week.description}`}</p>
                <a className="card-link" href={createSitePath(root, week.path)}>
                  {`Open ${week.label}`}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="study-card" aria-labelledby="organisation-heading">
        <h2 id="organisation-heading">How activities are organised</h2>
        <p>
          Learning activities sit inside each week’s area. Use the Week 1 to Week 3 pages to
          find Lesson 1, Lesson 2, Lesson 3 and homework.
        </p>
        <p>
          Technical Foundations remains available if you need extra practice with programming,
          requirements, decomposition, data or testing before or alongside the weekly sequence.
        </p>
        <a className="text-link" href={createSitePath(root, "foundations/")}>Open Foundations</a>
      </section>

      <Callout
        tone="info"
        title="Formative learning"
        message="These materials are for teaching and practice. They are not Pearson assessment tasks and do not produce a qualification grade."
      />
    </div>
  );
}
