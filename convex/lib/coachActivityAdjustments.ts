import { ConvexError, v, type Infer } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { isAwaitingActivityReconciliation } from "./coachActivityClosure";
import {
  coachActivityDateTime,
  resolveActivityTimeInput,
} from "./coachActivityTime";

const localTime = v.object({
  dateTime: v.string(),
  offsetMinutes: v.optional(v.number()),
});
export const activityTimeAdjustmentValidator = v.object({
  expectedCheckInAt: v.number(),
  expectedCheckOutAt: v.union(v.number(), v.null()),
  checkIn: localTime,
  checkOut: v.union(localTime, v.null()),
});
const timestamps = v.object({
  checkInAt: v.number(),
  checkOutAt: v.union(v.number(), v.null()),
});
export const activityTimeAdjustmentFields = {
  activityId: v.id("coachActivities"),
  before: timestamps,
  after: timestamps,
  adjustedBy: v.id("users"),
  adjustedAt: v.number(),
};

function resolveTime(
  input: Infer<typeof localTime>,
  original: number | undefined,
) {
  const result = resolveActivityTimeInput(input, original);
  if (result === "invalid") throw new ConvexError("Invalid activity time");
  if (result === "ambiguous") throw new ConvexError("Ambiguous activity time");
  return result;
}

export async function recordActivityTimeAdjustment(
  ctx: MutationCtx,
  activity: Doc<"coachActivities">,
  input: Infer<typeof activityTimeAdjustmentValidator>,
  userId: Id<"users">,
) {
  if (activity.checkInAt === undefined)
    throw new ConvexError("Earlier activity times cannot be adjusted");
  if (
    activity.checkInAt !== input.expectedCheckInAt ||
    (activity.checkOutAt ?? null) !== input.expectedCheckOutAt
  )
    throw new ConvexError("Activity times have changed");
  if (
    (activity.status !== "in_progress" && activity.status !== "completed") ||
    (activity.checkOutAt !== undefined && input.checkOut === null) ||
    (activity.checkOutAt === undefined &&
      input.checkOut !== null &&
      !isAwaitingActivityReconciliation(activity))
  )
    throw new ConvexError("Cannot add or remove checkout");
  const checkInAt = resolveTime(input.checkIn, activity.checkInAt);
  const checkOutAt = input.checkOut
    ? resolveTime(input.checkOut, activity.checkOutAt)
    : undefined;
  const now = Date.now();
  if (checkInAt > now || (checkOutAt !== undefined && checkOutAt > now))
    throw new ConvexError("Activity time cannot be in the future");
  if (checkOutAt !== undefined && checkOutAt < checkInAt)
    throw new ConvexError("Checkout cannot precede check-in");
  if (checkInAt === activity.checkInAt && checkOutAt === activity.checkOutAt)
    return {};
  await ctx.db.insert("coachActivityTimeAdjustments", {
    activityId: activity._id,
    before: {
      checkInAt: activity.checkInAt,
      checkOutAt: activity.checkOutAt ?? null,
    },
    after: { checkInAt, checkOutAt: checkOutAt ?? null },
    adjustedBy: userId,
    adjustedAt: now,
  });
  const { activityDate, time: startTime } = coachActivityDateTime(checkInAt);
  return {
    checkInAt,
    checkOutAt,
    activityDate,
    startTime,
    endTime:
      checkOutAt === undefined
        ? undefined
        : coachActivityDateTime(checkOutAt).time,
  };
}
