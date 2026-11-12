import { ConvexError, v, type Infer } from "convex/values";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { mutation, query } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireCoachAccess } from "./lib/coachAccess";
import {
  COACH_ACTIVITY_TIME_ZONE,
  coachActivityDateTime,
  coachActivityDurationMs,
  isActivityDate,
} from "./lib/coachActivityTime";

import {
  activitySortValidator,
  coachActivityListing,
  publicCoachActivity,
  sortedCoachActivities,
} from "./lib/coachActivityListing";

import {
  activityDateRangeValidator,
  summarizeActivityPeriod,
  MAX_PERIOD_ACTIVITIES,
} from "./lib/coachActivityPeriod";

const activityFields = {
  _id: v.id("coachActivities"),
  _creationTime: v.number(),
  coachId: v.id("coaches"),
  programId: v.id("programs"),
  placeId: v.id("programCoachOptions"),
  placeName: v.string(),
  activityDate: v.string(),
  startTime: v.string(),
  endTime: v.optional(v.string()),
  title: v.string(),
  description: v.optional(v.string()),
  imageStorageId: v.id("_storage"),
  checkOutImageStorageId: v.optional(v.id("_storage")),
  checkInAt: v.optional(v.number()),
  checkOutAt: v.optional(v.number()),
  status: v.optional(v.union(v.literal("in_progress"), v.literal("completed"))),
  timeZone: v.optional(v.literal("America/New_York")),
  completed: v.boolean(),
  createdBy: v.id("users"),
  updatedBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
};
const activityListItemValidator = v.object({
  ...activityFields,
  durationMs: v.union(v.number(), v.null()),
  checkInOrder: v.union(v.number(), v.null()),
  checkOutOrder: v.union(v.number(), v.null()),
});
const activityValidator = v.object({
  ...activityFields,
  imageUrl: v.union(v.string(), v.null()),
  checkOutImageUrl: v.union(v.string(), v.null()),
});

function activityListItem(
  activity: Doc<"coachActivities">,
): Infer<typeof activityListItemValidator> {
  const listing =
    activity.listing?.checkInOrder !== undefined &&
    activity.listing?.checkOutOrder !== undefined
      ? activity.listing
      : coachActivityListing(activity);
  return {
    ...publicCoachActivity(activity),
    durationMs: coachActivityDurationMs(activity),
    checkInOrder: listing.checkInOrder ?? null,
    checkOutOrder: listing.checkOutOrder ?? null,
  };
}

async function assertImage(ctx: MutationCtx, storageId: Id<"_storage">) {
  const metadata = await ctx.db.system.get("_storage", storageId);
  if (
    !metadata ||
    !["image/jpeg", "image/png", "image/webp"].includes(
      metadata.contentType ?? "",
    ) ||
    metadata.size <= 0 ||
    metadata.size > 5 * 1024 * 1024
  ) {
    throw new ConvexError(
      "A valid JPG, PNG or WebP image under 5 MB is required",
    );
  }
  const existingActivity = await ctx.db
    .query("coachActivities")
    .withIndex("byImageStorageId", (q) => q.eq("imageStorageId", storageId))
    .first();
  if (existingActivity) {
    throw new ConvexError("This image is already used by another activity");
  }
  const existingCheckout = await ctx.db
    .query("coachActivities")
    .withIndex("by_checkOutImageStorageId", (q) =>
      q.eq("checkOutImageStorageId", storageId),
    )
    .first();
  if (existingCheckout)
    throw new ConvexError("This image is already used for checkout");
}

async function assertPlace(
  ctx: MutationCtx,
  placeId: Id<"programCoachOptions">,
  programId: Id<"programs">,
) {
  const place = await ctx.db.get("programCoachOptions", placeId);
  if (!place || place.programId !== programId || place.kind !== "place") {
    throw new ConvexError("Invalid place");
  }
  return place;
}

function findOpenActivity(ctx: QueryCtx | MutationCtx, coachId: Id<"coaches">) {
  return ctx.db
    .query("coachActivities")
    .withIndex("by_coachId_and_status", (q) =>
      q.eq("coachId", coachId).eq("status", "in_progress"),
    )
    .first();
}

async function assertCanCheckIn(ctx: MutationCtx, coach: Doc<"coaches">) {
  if (coach.isArchived)
    throw new ConvexError("Archived coaches cannot add activities");
  if (await findOpenActivity(ctx, coach._id))
    throw new ConvexError("Coach already has an activity in progress");
}

export const getOpenActivityId = query({
  args: { coachId: v.id("coaches") },
  returns: v.union(v.id("coachActivities"), v.null()),
  handler: async (ctx, { coachId }) => {
    await requireCoachAccess(ctx, coachId);
    return (await findOpenActivity(ctx, coachId))?._id ?? null;
  },
});

export const getSummary = query({
  args: { coachId: v.id("coaches") },
  returns: v.object({
    activityCount: v.number(),
    totalMinutes: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireCoachAccess(ctx, args.coachId);
    let activityCount = 0;
    let totalDurationMs = 0;
    // shortcut: scan this coach's history; add counters if histories reach Convex read limits.
    for await (const activity of ctx.db
      .query("coachActivities")
      .withIndex("byCoach", (q) => q.eq("coachId", args.coachId))) {
      activityCount += 1;
      totalDurationMs += coachActivityDurationMs(activity) ?? 0;
    }
    return {
      activityCount,
      totalMinutes: Math.floor(totalDurationMs / 60000),
    };
  },
});

export const getPeriodByCoach = query({
  args: { coachId: v.id("coaches"), range: activityDateRangeValidator },
  returns: v.union(
    v.object({ status: v.literal("limitExceeded") }),
    v.object({
      status: v.literal("ready"),
      activities: v.array(activityListItemValidator),
      summary: v.object({
        activityCount: v.number(),
        totalDurationMs: v.number(),
        pendingCount: v.number(),
        unknownDurationCount: v.number(),
      }),
    }),
  ),
  handler: async (ctx, { coachId, range }) => {
    await requireCoachAccess(ctx, coachId);
    if (
      !isActivityDate(range.from) ||
      !isActivityDate(range.to) ||
      range.from > range.to
    )
      throw new ConvexError("Invalid activity date range");
    const records = await ctx.db
      .query("coachActivities")
      .withIndex("byCoachAndDate", (q) =>
        q
          .eq("coachId", coachId)
          .gte("activityDate", range.from)
          .lte("activityDate", range.to),
      )
      .take(MAX_PERIOD_ACTIVITIES + 1);
    if (records.length > MAX_PERIOD_ACTIVITIES)
      return { status: "limitExceeded" as const };
    const activities = records.map(activityListItem);
    return {
      status: "ready" as const,
      activities,
      summary: summarizeActivityPeriod(activities),
    };
  },
});

export const getById = query({
  args: { activityId: v.id("coachActivities") },
  returns: v.union(activityValidator, v.null()),
  handler: async (ctx, args) => {
    const activity = await ctx.db.get("coachActivities", args.activityId);
    if (!activity) return null;
    await requireCoachAccess(ctx, activity.coachId);
    return {
      ...publicCoachActivity(activity),
      imageUrl: await ctx.storage.getUrl(activity.imageStorageId),
      checkOutImageUrl: activity.checkOutImageStorageId
        ? await ctx.storage.getUrl(activity.checkOutImageStorageId)
        : null,
    };
  },
});

export const listOpenByCoach = query({
  args: {
    coachId: v.id("coaches"),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(activitySortValidator),
  },
  returns: paginationResultValidator(activityListItemValidator),
  handler: async (ctx, args) => {
    await requireCoachAccess(ctx, args.coachId);
    // Unsorted clients keep working while listing indexes are backfilled.
    const result = await (
      args.sort
        ? sortedCoachActivities(ctx, args.coachId, "open", args.sort)
        : ctx.db
            .query("coachActivities")
            .withIndex("by_coachId_and_status", (q) =>
              q.eq("coachId", args.coachId).eq("status", "in_progress"),
            )
            .order("desc")
    ).paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map(activityListItem),
    };
  },
});

export const listHistoryByCoach = query({
  args: {
    coachId: v.id("coaches"),
    paginationOpts: paginationOptsValidator,
    sort: v.optional(activitySortValidator),
  },
  returns: paginationResultValidator(activityListItemValidator),
  handler: async (ctx, args) => {
    await requireCoachAccess(ctx, args.coachId);
    // Completed check-ins first, followed by earlier records without a status.
    const result = await (
      args.sort
        ? sortedCoachActivities(ctx, args.coachId, "history", args.sort)
        : ctx.db
            .query("coachActivities")
            .withIndex("by_coachId_and_status", (q) =>
              q.eq("coachId", args.coachId).lt("status", "in_progress"),
            )
            .order("desc")
    ).paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map(activityListItem),
    };
  },
});

export const generateUploadUrl = mutation({
  args: {
    coachId: v.id("coaches"),
    activityId: v.optional(v.id("coachActivities")),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { coach } = await requireCoachAccess(ctx, args.coachId);
    if (args.activityId) {
      const activity = await ctx.db.get(args.activityId);
      if (!activity || activity.coachId !== coach._id) {
        throw new Error("Activity not found");
      }
      if (
        activity.checkInAt === undefined ||
        activity.status !== "in_progress"
      ) {
        throw new ConvexError("Activity already checked out");
      }
    } else await assertCanCheckIn(ctx, coach);
    return await ctx.storage.generateUploadUrl();
  },
});

export const checkIn = mutation({
  args: {
    coachId: v.id("coaches"),
    placeId: v.id("programCoachOptions"),
    title: v.string(),
    description: v.optional(v.string()),
    imageStorageId: v.id("_storage"),
  },
  returns: v.id("coachActivities"),
  handler: async (ctx, args) => {
    const { coach, user } = await requireCoachAccess(ctx, args.coachId);
    const existing = await ctx.db
      .query("coachActivities")
      .withIndex("byImageStorageId", (q) =>
        q.eq("imageStorageId", args.imageStorageId),
      )
      .first();
    if (existing?.coachId === coach._id && existing.checkInAt !== undefined) {
      return existing._id;
    }
    await assertCanCheckIn(ctx, coach);
    if (!args.title.trim()) throw new ConvexError("Title is required");
    const place = await assertPlace(ctx, args.placeId, coach.programId);
    await assertImage(ctx, args.imageStorageId);
    const now = Date.now();
    const { activityDate, time } = coachActivityDateTime(now);
    const record = {
      coachId: coach._id,
      programId: coach.programId,
      placeId: place._id,
      placeName: place.name,
      activityDate,
      startTime: time,
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      imageStorageId: args.imageStorageId,
      checkInAt: now,
      status: "in_progress",
      timeZone: COACH_ACTIVITY_TIME_ZONE,
      completed: false,
      createdBy: user._id,
      updatedBy: user._id,
      createdAt: now,
      updatedAt: now,
    } as const;
    return await ctx.db.insert("coachActivities", {
      ...record,
      listing: coachActivityListing(record),
    });
  },
});

export const checkOut = mutation({
  args: {
    activityId: v.id("coachActivities"),
    imageStorageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const activity = await ctx.db.get("coachActivities", args.activityId);
    if (!activity) throw new ConvexError("Activity not found");
    const { user } = await requireCoachAccess(ctx, activity.coachId);
    if (
      activity.status === "completed" &&
      activity.checkOutImageStorageId === args.imageStorageId
    )
      return null;
    if (activity.checkInAt === undefined || activity.status !== "in_progress") {
      throw new ConvexError("Activity is not open for checkout");
    }
    await assertImage(ctx, args.imageStorageId);
    const now = Date.now();
    const { time } = coachActivityDateTime(now);
    const changes = {
      checkOutImageStorageId: args.imageStorageId,
      checkOutAt: now,
      endTime: time,
      status: "completed",
      completed: true,
      updatedBy: user._id,
      updatedAt: now,
    } as const;
    await ctx.db.patch("coachActivities", activity._id, {
      ...changes,
      listing: coachActivityListing({ ...activity, ...changes }),
    });
    return null;
  },
});

export const update = mutation({
  args: {
    activityId: v.id("coachActivities"),
    placeId: v.id("programCoachOptions"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const activity = await ctx.db.get("coachActivities", args.activityId);
    if (!activity) throw new ConvexError("Activity not found");
    const { user } = await requireCoachAccess(ctx, activity.coachId);
    if (!args.title.trim()) throw new ConvexError("Title is required");
    const place = await assertPlace(ctx, args.placeId, activity.programId);
    const changes = {
      placeId: place._id,
      placeName: place.name,
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      updatedBy: user._id,
      updatedAt: Date.now(),
    };
    await ctx.db.patch("coachActivities", activity._id, {
      ...changes,
      listing: coachActivityListing({ ...activity, ...changes }),
    });
    return null;
  },
});

export const remove = mutation({
  args: { activityId: v.id("coachActivities") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const activity = await ctx.db.get(args.activityId);
    if (!activity) return null;
    await requireCoachAccess(ctx, activity.coachId);
    await ctx.storage.delete(activity.imageStorageId);
    if (activity.checkOutImageStorageId) {
      await ctx.storage.delete(activity.checkOutImageStorageId);
    }
    await ctx.db.delete(activity._id);
    return null;
  },
});
