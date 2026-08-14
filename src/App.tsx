import { HubShell, LearnerHeader } from "@learning-platform/ui";
import { CourseLayout } from "./components/CourseSidebar";
import { APP_CONFIG } from "./config";
import { useHubPlatform } from "./hooks/useHubPlatform";
import { currentIds, type PageContext } from "./page-context";
import { breadcrumbs, pageHeader } from "./page-copy";
import { CourseGuidePage } from "./pages/CourseGuidePage";
import { FoundationActivityPage } from "./pages/FoundationActivityPage";
import { FoundationsPage } from "./pages/FoundationsPage";
import { HomePage } from "./pages/HomePage";
import {
  AssessmentPracticePage,
  HelpPage,
  ProjectsPage,
  ResourcesPage,
  TaskPage
} from "./pages/StaticPages";
import { createSitePath, navigationItems } from "./paths";

function PageBody({ context, adaptersReady }: { context: PageContext; adaptersReady: boolean }) {
  if (context.activity) {
    return <FoundationActivityPage activityId={context.activity} adaptersReady={adaptersReady} />;
  }
  if (context.page === "course-guide") return <CourseGuidePage root={context.root} />;
  if (context.page === "foundations") return <FoundationsPage root={context.root} adaptersReady={adaptersReady} />;
  if (context.page === "projects") return <ProjectsPage root={context.root} />;
  if (context.page === "task-1") {
    return <TaskPage root={context.root} task="1" related={[{ label: "Foundations", path: "foundations/" }, { label: "Task 2", path: "task-2/" }]} />;
  }
  if (context.page === "task-2") {
    return <TaskPage root={context.root} task="2" related={[{ label: "Task 1", path: "task-1/" }, { label: "Task 3", path: "task-3/" }]} />;
  }
  if (context.page === "task-3") {
    return <TaskPage root={context.root} task="3" related={[{ label: "Task 2", path: "task-2/" }, { label: "Assessment Practice", path: "assessment-practice/" }]} />;
  }
  if (context.page === "assessment-practice") return <AssessmentPracticePage root={context.root} />;
  if (context.page === "resources") return <ResourcesPage root={context.root} />;
  if (context.page === "help") return <HelpPage />;
  return <HomePage root={context.root} />;
}

export function App({ context }: { context: PageContext }) {
  const { learner, theme, accountDialog, platform, adaptersReady } = useHubPlatform(context.root);
  const header = pageHeader(context);

  return (
    <HubShell
      brandTitle={APP_CONFIG.shortName}
      brandTagline={APP_CONFIG.qualification}
      navigation={navigationItems([...APP_CONFIG.navigation], context.root)}
      currentId={context.section}
      currentIds={currentIds(context)}
      theme={theme}
      actions={(
        <div className="student-account" data-student-account="">
          {learner ? (
            <>
              <span className="student-account__name">{learner.displayName || learner.fullName || "Learner"}</span>
              <button
                className="lp-button lp-button--secondary"
                type="button"
                onClick={(event) => accountDialog?.open(event.currentTarget)}
              >
                Account
              </button>
            </>
          ) : (
            <button
              className="lp-button lp-button--secondary"
              type="button"
              data-student-sign-in=""
              onClick={(event) => accountDialog?.open(event.currentTarget)}
            >
              Sign in
            </button>
          )}
        </div>
      )}
      breadcrumbs={breadcrumbs(context)}
      resolveHref={(path) => createSitePath(context.root, path)}
      pageHeader={header}
      learnerHeader={(
        <LearnerHeader
          learner={learner}
          hubName={platform.config.hubName}
          accountHref={platform.config.accountPath}
          onSignOut={() => platform.auth.signOut()}
        />
      )}
      footer={{
        lines: [
          "Software Development Hub",
          "T Level Digital Software Development",
          APP_CONFIG.currentPhase
        ]
      }}
    >
      <CourseLayout currentPage={context.section} root={context.root}>
        <PageBody context={context} adaptersReady={adaptersReady} />
      </CourseLayout>
    </HubShell>
  );
}
