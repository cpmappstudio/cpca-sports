import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { coachActivityListing } from "./lib/coachActivityListing";
import { coachActivityDateTime, isActivityDate } from "./lib/coachActivityTime";

const closureTarget = v.object({
  activityId: v.id("coachActivities"),
  snapshot: v.string(),
});

async function migrationOrganization(
  ctx: QueryCtx | MutationCtx,
  slug: string,
  beforeDate: string,
) {
  if (
    !isActivityDate(beforeDate) ||
    beforeDate > coachActivityDateTime(Date.now()).activityDate
  )
    throw new ConvexError("Invalid migration cutoff");
  const organization = await ctx.db
    .query("organizations")
    .withIndex("bySlug", (q) => q.eq("slug", slug))
    .unique();
  if (!organization) throw new ConvexError("Organization not found");
  return organization;
}

function canCloseAdministratively(
  activity: Doc<"coachActivities">,
  beforeDate: string,
) {
  return (
    activity.status === "in_progress" &&
    !activity.completed &&
    activity.checkInAt !== undefined &&
    Number.isFinite(activity.checkInAt) &&
    coachActivityDateTime(activity.checkInAt).activityDate < beforeDate &&
    activity.checkOutAt === undefined &&
    activity.checkOutImageStorageId === undefined &&
    activity.endTime === undefined &&
    activity.administrativeClosure === undefined
  );
}

export const previewAdministrativeClosures = internalQuery({
  args: {
    organizationSlug: v.string(),
    beforeDate: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({
    continueCursor: v.string(),
    isDone: v.boolean(),
    candidates: v.array(
      v.object({
        ...closureTarget.fields,
        coachName: v.string(),
        title: v.string(),
        placeName: v.string(),
        activityDate: v.string(),
        checkInAt: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const organization = await migrationOrganization(
      ctx,
      args.organizationSlug,
      args.beforeDate,
    );
    const page = await ctx.db
      .query("coachActivities")
      .paginate({ numItems: 50, cursor: args.cursor });
    const candidates = [];
    for (const activity of page.page) {
      if (!canCloseAdministratively(activity, args.beforeDate)) continue;
      const coach = await ctx.db.get("coaches", activity.coachId);
      if (coach?.organizationId !== organization._id) continue;
      const user = await ctx.db.get("users", coach.userId);
      candidates.push({
        activityId: activity._id,
        snapshot: JSON.stringify(activity),
        coachName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
        title: activity.title,
        placeName: activity.placeName,
        activityDate: activity.activityDate,
        checkInAt: activity.checkInAt!,
      });
    }
    return {
      continueCursor: page.continueCursor,
      isDone: page.isDone,
      candidates,
    };
  },
});

export const closeAdministratively = internalMutation({
  args: {
    organizationSlug: v.string(),
    beforeDate: v.string(),
    migrationId: v.string(),
    operator: v.string(),
    targets: v.array(closureTarget),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      activityId: v.id("coachActivities"),
      result: v.union(
        v.literal("wouldClose"),
        v.literal("closed"),
        v.literal("alreadyClosed"),
        v.literal("changed"),
        v.literal("ineligible"),
        v.literal("missing"),
        v.literal("wrongOrganization"),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const organization = await migrationOrganization(
      ctx,
      args.organizationSlug,
      args.beforeDate,
    );
    if (
      !args.operator.trim() ||
      args.operator.length > 200 ||
      !args.migrationId.trim() ||
      args.migrationId.length > 100
    )
      throw new ConvexError("Migration operator and identifier are required");
    if (
      args.targets.length > 50 ||
      new Set(args.targets.map((target) => target.activityId)).size !==
        args.targets.length
    )
      throw new ConvexError(
        "A migration batch must have at most 50 distinct activities",
      );
    const results = [];
    for (const target of args.targets) {
      const activity = await ctx.db.get("coachActivities", target.activityId);
      const result = async () => {
        if (!activity) return "missing" as const;
        const coach = await ctx.db.get("coaches", activity.coachId);
        if (coach?.organizationId !== organization._id)
          return "wrongOrganization" as const;
        if (activity.administrativeClosure) return "alreadyClosed" as const;
        if (JSON.stringify(activity) !== target.snapshot)
          return "changed" as const;
        if (!canCloseAdministratively(activity, args.beforeDate))
          return "ineligible" as const;
        if (args.dryRun !== false) return "wouldClose" as const;
        const changes = {
          status: "completed",
          completed: true,
          administrativeClosure: {
            closedAt: Date.now(),
            migrationId: args.migrationId,
            operator: args.operator.trim(),
          },
        } as const;
        await ctx.db.patch("coachActivities", activity._id, {
          ...changes,
          listing: coachActivityListing({ ...activity, ...changes }),
        });
        return "closed" as const;
      };
      results.push({ activityId: target.activityId, result: await result() });
    }
    return results;
  },
});

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
