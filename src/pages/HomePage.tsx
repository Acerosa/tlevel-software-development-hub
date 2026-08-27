import { Callout, StatusBadge } from "@learning-platform/ui";
import bundledPackage from "../../content/tlevel-software-development/package.json";
import {
  homeWeeksFromPackage,
  overlayLiveWeekMetadata,
  type ContentPackage
} from "../curriculum/from-package";
import { createSitePath } from "../paths";

function homeBadgeLabel(week: { openable: boolean; current: boolean; status: string }) {
  if (week.openable) return week.current ? "Active" : "Available";
  return week.status === "archived" ? "Archived" : "Coming soon";
}

function lockedWeekLabel(week: { status: string; weekCommencingLabel: string }) {
  if (week.status === "archived") return "This week is archived";
  if (week.weekCommencingLabel) return `Coming soon · week commencing ${week.weekCommencingLabel}`;
  return "Coming soon";
}

export function HomePage({ root, pkg }: { root: string; pkg?: ContentPackage | null }) {
  const content = overlayLiveWeekMetadata(bundledPackage as ContentPackage, pkg);
  const weeks = homeWeeksFromPackage(content);

  return (
    <div className="study-stack">
      <section className="study-card" aria-labelledby="welcome-heading">
        <h2 id="welcome-heading">Welcome</h2>
        <p>
          This hub brings together the 22-week teaching sequence for Occupational
          Specialism Areas 1 to 3, using the continuing Oakfield Adult Skills Hub
          client scenario.
        </p>
        <p>
          Start with the current week’s overview. Lessons, retrieval, application tasks and
          homework for that week are listed there so you can follow the Scheme of Learning
          without hunting across the site.
        </p>
      </section>

      <section aria-labelledby="start-heading">
        <h2 id="start-heading">Where to start</h2>
        <div className="home-week-scroller" tabIndex={0} aria-label="Week cards">
          <div className="card-grid">
            {weeks.map((week) => (
              <article className="hub-card" key={week.id}>
                <StatusBadge
                  status={week.openable ? "available" : (week.status || "planned")}
                  label={homeBadgeLabel(week)}
                />
                <h3>{week.label}</h3>
                <p>{`${week.title}. ${week.description}`}</p>
                {week.openable ? (
                  <a className="card-link" href={createSitePath(root, week.path)}>
                    {`Open ${week.label}`}
                  </a>
                ) : (
                  <p>{lockedWeekLabel(week)}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="study-card" aria-labelledby="organisation-heading">
        <h2 id="organisation-heading">How activities are organised</h2>
        <p>
          Learning activities sit inside each week’s area. Each taught week has three lessons
          and homework. Weeks 19 to 22 are revision for Task 1, then industry placement.
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
