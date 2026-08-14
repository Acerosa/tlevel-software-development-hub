import { useEffect } from "react";
import { Callout, LoadingState } from "@learning-platform/ui";
import { bootFoundationActivity } from "../activities/bootstrap";
import { activityCopy } from "../page-copy";

export function FoundationActivityPage({
  activityId,
  adaptersReady
}: {
  activityId: string;
  adaptersReady: boolean;
}) {
  const copy = activityCopy(activityId);

  useEffect(() => {
    if (!adaptersReady) return;
    void bootFoundationActivity(activityId);
  }, [activityId, adaptersReady]);

  if (!adaptersReady) {
    return <LoadingState message="Loading activity..." />;
  }

  return (
    <>
      {copy?.note ? (
        <p className="activity-note">{copy.note}</p>
      ) : (
        <Callout
          tone="info"
          title="Formative activity"
          message="This activity is formative. It is not a qualification grade, and you can retry it."
        />
      )}
      <div data-foundation-activity="">
        <p>Loading activity...</p>
      </div>
    </>
  );
}
