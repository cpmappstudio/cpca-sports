import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";

export const MAX_PERIOD_ACTIVITIES = 1000;
export const activityDateRangeValidator = v.object({
  from: v.string(),
  to: v.string(),
});

type PeriodActivity = Pick<Doc<"coachActivities">, "status"> & {
  durationMs: number | null;
};

export function summarizeActivityPeriod(activities: PeriodActivity[]) {
  let totalDurationMs = 0;
  let pendingCount = 0;
  let unknownDurationCount = 0;
  for (const activity of activities) {
    if (activity.status === "in_progress") pendingCount += 1;
    else if (activity.durationMs === null) unknownDurationCount += 1;
    else totalDurationMs += activity.durationMs;
  }
  return {
    activityCount: activities.length,
    totalDurationMs,
    pendingCount,
    unknownDurationCount,
  };
}
