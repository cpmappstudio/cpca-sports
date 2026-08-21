import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireProgramCoachAdmin } from "./lib/coachAccess";
import { requireCoachAccess } from "./lib/coachAccess";

const optionKind = v.union(v.literal("position"), v.literal("place"));
const optionValidator = v.object({
  _id: v.id("programCoachOptions"),
  _creationTime: v.number(),
  programId: v.id("programs"),
  kind: optionKind,
  name: v.string(),
  normalizedName: v.string(),
  createdBy: v.id("users"),
  createdAt: v.number(),
});

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export const listByProgram = query({
  args: { programId: v.id("programs") },
  returns: v.array(optionValidator),
  handler: async (ctx, args) => {
    await requireProgramCoachAdmin(ctx, args.programId);
    const options = await ctx.db
      .query("programCoachOptions")
      .withIndex("byProgram", (q) => q.eq("programId", args.programId))
      .collect();
    return options.sort((left, right) => left.name.localeCompare(right.name));
  },
});

export const listPlacesForCoach = query({
  args: {
    coachId: v.id("coaches"),
    activityId: v.optional(v.id("coachActivities")),
  },
  returns: v.array(optionValidator),
  handler: async (ctx, args) => {
    const { coach } = await requireCoachAccess(ctx, args.coachId);
    const activity = args.activityId ? await ctx.db.get(args.activityId) : null;
    if (args.activityId && (!activity || activity.coachId !== coach._id)) {
      throw new Error("Activity not found");
    }
    const places = await ctx.db
      .query("programCoachOptions")
      .withIndex("byProgramAndKind", (q) =>
        q
          .eq("programId", activity?.programId ?? coach.programId)
          .eq("kind", "place"),
      )
      .collect();
    return places.sort((left, right) => left.name.localeCompare(right.name));
  },
});

export const create = mutation({
  args: { programId: v.id("programs"), kind: optionKind, name: v.string() },
  returns: v.id("programCoachOptions"),
  handler: async (ctx, args) => {
    const { user } = await requireProgramCoachAdmin(ctx, args.programId);
    const name = args.name.trim();
    const normalizedName = normalize(name);
    if (!name) throw new Error("Name is required");

    const duplicate = await ctx.db
      .query("programCoachOptions")
      .withIndex("byProgramKindAndName", (q) =>
        q
          .eq("programId", args.programId)
          .eq("kind", args.kind)
          .eq("normalizedName", normalizedName),
      )
      .unique();
    if (duplicate) throw new Error("This option already exists");

    return await ctx.db.insert("programCoachOptions", {
      programId: args.programId,
      kind: args.kind,
      name,
      normalizedName,
      createdBy: user._id,
      createdAt: Date.now(),
    });
  },
});

export const rename = mutation({
  args: { optionId: v.id("programCoachOptions"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const option = await ctx.db.get(args.optionId);
    if (!option) throw new Error("Option not found");
    await requireProgramCoachAdmin(ctx, option.programId);

    const name = args.name.trim();
    const normalizedName = normalize(name);
    if (!name) throw new Error("Name is required");
    const duplicate = await ctx.db
      .query("programCoachOptions")
      .withIndex("byProgramKindAndName", (q) =>
        q
          .eq("programId", option.programId)
          .eq("kind", option.kind)
          .eq("normalizedName", normalizedName),
      )
      .unique();
    if (duplicate && duplicate._id !== option._id) {
      throw new Error("This option already exists");
    }
    await ctx.db.patch(option._id, { name, normalizedName });
    return null;
  },
});

export const remove = mutation({
  args: { optionId: v.id("programCoachOptions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const option = await ctx.db.get(args.optionId);
    if (!option) return null;
    await requireProgramCoachAdmin(ctx, option.programId);

    if (option.kind === "position") {
      const coach = await ctx.db
        .query("coaches")
        .withIndex("byPosition", (q) => q.eq("positionId", option._id))
        .first();
      if (coach) throw new Error("This position is assigned to a coach");
    } else {
      const activity = await ctx.db
        .query("coachActivities")
        .withIndex("byPlace", (q) => q.eq("placeId", option._id))
        .first();
      if (activity) throw new Error("This place is used by an activity");
    }

    await ctx.db.delete(option._id);
    return null;
  },
});
