import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { requireCoachAccess } from "./lib/coachAccess";

const activityValidator = v.object({
  _id: v.id("coachActivities"),
  _creationTime: v.number(),
  coachId: v.id("coaches"),
  programId: v.id("programs"),
  placeId: v.id("programCoachOptions"),
  placeName: v.string(),
  activityDate: v.string(),
  startTime: v.string(),
  endTime: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  imageStorageId: v.id("_storage"),
  imageUrl: v.union(v.string(), v.null()),
  completed: v.boolean(),
  createdBy: v.id("users"),
  updatedBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidDate(value: string) {
  if (!datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function assertFields(args: {
  activityDate: string;
  startTime: string;
  endTime: string;
  title: string;
}) {
  if (!isValidDate(args.activityDate)) throw new Error("Invalid date");
  if (!timePattern.test(args.startTime) || !timePattern.test(args.endTime)) {
    throw new Error("Invalid time");
  }
  if (args.endTime <= args.startTime) {
    throw new Error("End time must be later than start time");
  }
  if (!args.title.trim()) throw new Error("Title is required");
}

async function assertImage(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  activityId?: Id<"coachActivities">,
) {
  const metadata = await ctx.db.system.get(storageId);
  if (!metadata || !metadata.contentType?.startsWith("image/")) {
    throw new Error("A valid image is required");
  }
  if (metadata.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5 MB");
  }
  const existingActivity = await ctx.db
    .query("coachActivities")
    .withIndex("byImageStorageId", (q) => q.eq("imageStorageId", storageId))
    .first();
  if (existingActivity && existingActivity._id !== activityId) {
    throw new Error("This image is already used by another activity");
  }
}

export const listByCoach = query({
  args: { coachId: v.id("coaches") },
  returns: v.array(activityValidator),
  handler: async (ctx, args) => {
    await requireCoachAccess(ctx, args.coachId);
    const activities = await ctx.db
      .query("coachActivities")
      .withIndex("byCoach", (q) => q.eq("coachId", args.coachId))
      .collect();
    return await Promise.all(
      activities
        .sort((left, right) =>
          `${right.activityDate} ${right.startTime}`.localeCompare(
            `${left.activityDate} ${left.startTime}`,
          ),
        )
        .map(async (activity) => ({
          ...activity,
          imageUrl: await ctx.storage.getUrl(activity.imageStorageId),
        })),
    );
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
    } else if (coach.isArchived) {
      throw new Error("Archived coaches cannot add activities");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    coachId: v.id("coaches"),
    placeId: v.id("programCoachOptions"),
    activityDate: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    imageStorageId: v.id("_storage"),
    completed: v.boolean(),
  },
  returns: v.id("coachActivities"),
  handler: async (ctx, args) => {
    const { coach, user } = await requireCoachAccess(ctx, args.coachId);
    if (coach.isArchived)
      throw new Error("Archived coaches cannot add activities");
    assertFields(args);
    await assertImage(ctx, args.imageStorageId);
    const place = await ctx.db.get(args.placeId);
    if (
      !place ||
      place.programId !== coach.programId ||
      place.kind !== "place"
    ) {
      throw new Error("Invalid place");
    }
    const now = Date.now();
    return await ctx.db.insert("coachActivities", {
      coachId: coach._id,
      programId: coach.programId,
      placeId: place._id,
      placeName: place.name,
      activityDate: args.activityDate,
      startTime: args.startTime,
      endTime: args.endTime,
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      imageStorageId: args.imageStorageId,
      completed: args.completed,
      createdBy: user._id,
      updatedBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    activityId: v.id("coachActivities"),
    placeId: v.id("programCoachOptions"),
    activityDate: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    completed: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const activity = await ctx.db.get(args.activityId);
    if (!activity) throw new Error("Activity not found");
    const { user } = await requireCoachAccess(ctx, activity.coachId);
    assertFields(args);
    const place = await ctx.db.get(args.placeId);
    if (
      !place ||
      place.programId !== activity.programId ||
      place.kind !== "place"
    ) {
      throw new Error("Invalid place");
    }
    if (args.imageStorageId) {
      await assertImage(ctx, args.imageStorageId, activity._id);
    }
    const previousImage = activity.imageStorageId;
    await ctx.db.patch(activity._id, {
      placeId: place._id,
      placeName: place.name,
      activityDate: args.activityDate,
      startTime: args.startTime,
      endTime: args.endTime,
      title: args.title.trim(),
      description: args.description?.trim() || undefined,
      imageStorageId: args.imageStorageId ?? previousImage,
      completed: args.completed,
      updatedBy: user._id,
      updatedAt: Date.now(),
    });
    if (args.imageStorageId && args.imageStorageId !== previousImage) {
      await ctx.storage.delete(previousImage);
    }
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
    await ctx.db.delete(activity._id);
    return null;
  },
});
