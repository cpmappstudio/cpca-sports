import { v, type Infer } from "convex/values";

export const administrativeClosureValidator = v.object({
  migrationId: v.string(),
  closedAt: v.number(),
  operator: v.string(),
});

export function isAwaitingActivityReconciliation(activity: {
  administrativeClosure?: Infer<typeof administrativeClosureValidator>;
  status?: "in_progress" | "completed";
  checkOutAt?: number;
}) {
  return (
    activity.administrativeClosure !== undefined &&
    activity.status === "completed" &&
    activity.checkOutAt === undefined
  );
}
