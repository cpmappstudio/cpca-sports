import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const listByClubSlug = query({
  args: { clubSlug: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      name: v.string(),
      ageGroup: v.string(),
      gender: v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("mixed"),
      ),
      status: v.union(v.literal("active"), v.literal("inactive")),
    }),
  ),
  handler: async (ctx, args) => {
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.clubSlug))
      .unique();

    if (!club) {
      return [];
    }

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_clubId", (q) => q.eq("clubId", club._id))
      .collect();

    return categories.map((category) => ({
      _id: category._id,
      _creationTime: category._creationTime,
      name: category.name,
      ageGroup: category.ageGroup,
      gender: category.gender,
      status: category.status,
    }));
  },
});

export const listByClubSlugWithPlayerCount = query({
  args: { clubSlug: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      name: v.string(),
      ageGroup: v.string(),
      gender: v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("mixed"),
      ),
      status: v.union(v.literal("active"), v.literal("inactive")),
      playerCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.clubSlug))
      .unique();

    if (!club) {
      return [];
    }

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_clubId", (q) => q.eq("clubId", club._id))
      .collect();

    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const players = await ctx.db
          .query("players")
          .withIndex("by_currentCategoryId", (q) =>
            q.eq("currentCategoryId", category._id),
          )
          .collect();

        return {
          _id: category._id,
          _creationTime: category._creationTime,
          name: category.name,
          ageGroup: category.ageGroup,
          gender: category.gender,
          status: category.status,
          playerCount: players.length,
        };
      }),
    );

    return categoriesWithCount;
  },
});
