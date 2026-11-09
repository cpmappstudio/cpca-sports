import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { coachActivityListing } from "./lib/coachActivityListing";

// Run after deploying the backend and before releasing the sortable frontend.
export const backfillListing = internalMutation({
  args: { cursor: v.union(v.string(), v.null()), dryRun: v.boolean() },
  returns: v.object({
    continueCursor: v.string(),
    isDone: v.boolean(),
    processed: v.number(),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("coachActivities")
      .paginate({ numItems: 100, cursor: args.cursor });
    for (const activity of result.page) {
      const listing = coachActivityListing(activity);
      if (!args.dryRun) {
        await ctx.db.patch("coachActivities", activity._id, { listing });
      }
    }
    return {
      continueCursor: result.continueCursor,
      isDone: result.isDone,
      processed: result.page.length,
    };
  },
});
