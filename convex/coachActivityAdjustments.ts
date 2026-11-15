import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireCoachAdmin } from "./lib/coachAccess";
import { activityTimeAdjustmentFields } from "./lib/coachActivityAdjustments";

export const listByActivity = query({
  args: {
    activityId: v.id("coachActivities"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(
    v.object({
      ...activityTimeAdjustmentFields,
      _id: v.id("coachActivityTimeAdjustments"),
      _creationTime: v.number(),
      adjustedByName: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const activity = await ctx.db.get("coachActivities", args.activityId);
    if (!activity) throw new Error("Activity not found");
    await requireCoachAdmin(ctx, activity.coachId);
    const result = await ctx.db
      .query("coachActivityTimeAdjustments")
      .withIndex("by_activityId", (q) => q.eq("activityId", args.activityId))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (entry) => {
          const actor = await ctx.db.get("users", entry.adjustedBy);
          const record = { ...entry };
          delete record.reason;
          return {
            ...record,
            adjustedByName: actor
              ? `${actor.firstName} ${actor.lastName}`.trim()
              : "",
          };
        }),
      ),
    };
  },
});

export const removeForActivity = internalMutation({
  args: { activityId: v.id("coachActivities") },
  returns: v.null(),
  handler: async (ctx, { activityId }) => {
    if (await ctx.db.get("coachActivities", activityId)) return null;
    const entries = await ctx.db
      .query("coachActivityTimeAdjustments")
      .withIndex("by_activityId", (q) => q.eq("activityId", activityId))
      .take(100);
    for (const entry of entries)
      await ctx.db.delete("coachActivityTimeAdjustments", entry._id);
    if (entries.length === 100)
      await ctx.scheduler.runAfter(
        0,
        internal.coachActivityAdjustments.removeForActivity,
        { activityId },
      );
    return null;
  },
});
