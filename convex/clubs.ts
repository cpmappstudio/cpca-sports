import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * List clubs by league slug
 */
export const listByLeagueSlug = query({
  args: { leagueSlug: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("clubs"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      shortName: v.optional(v.string()),
      logoUrl: v.optional(v.string()),
      status: v.union(
        v.literal("affiliated"),
        v.literal("invited"),
        v.literal("suspended")
      ),
      foundedYear: v.optional(v.number()),
      headquarters: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!league) {
      return [];
    }

    const clubs = await ctx.db
      .query("clubs")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
      .collect();

    return clubs;
  },
});

/**
 * Get club by ID
 */
export const getById = query({
  args: { clubId: v.id("clubs") },
  returns: v.union(
    v.object({
      _id: v.id("clubs"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      shortName: v.optional(v.string()),
      logoUrl: v.optional(v.string()),
      leagueId: v.id("leagues"),
      fifaId: v.optional(v.string()),
      headquarters: v.optional(v.string()),
      status: v.union(
        v.literal("affiliated"),
        v.literal("invited"),
        v.literal("suspended")
      ),
      taxId: v.optional(v.string()),
      foundedYear: v.optional(v.number()),
      colors: v.optional(v.array(v.string())),
      website: v.optional(v.string()),
      email: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.clubId);
  },
});

/**
 * List all clubs for a league by league ID
 */
export const listByLeagueId = query({
  args: { leagueId: v.id("leagues") },
  returns: v.array(
    v.object({
      _id: v.id("clubs"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      shortName: v.optional(v.string()),
      logoUrl: v.optional(v.string()),
      status: v.union(
        v.literal("affiliated"),
        v.literal("invited"),
        v.literal("suspended")
      ),
      foundedYear: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const clubs = await ctx.db
      .query("clubs")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", args.leagueId))
      .collect();

    return clubs;
  },
});

/**
 * Create a new club
 */
export const create = mutation({
  args: {
    leagueId: v.id("leagues"),
    name: v.string(),
    slug: v.string(),
    shortName: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    headquarters: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
    colors: v.optional(v.array(v.string())),
    website: v.optional(v.string()),
    email: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  returns: v.id("clubs"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const league = await ctx.db.get(args.leagueId);
    if (!league) {
      throw new Error("League not found");
    }

    const existingBySlug = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existingBySlug) {
      throw new Error("A club with this slug already exists");
    }

    return await ctx.db.insert("clubs", {
      leagueId: args.leagueId,
      name: args.name,
      slug: args.slug,
      shortName: args.shortName,
      logoUrl: args.logoUrl,
      headquarters: args.headquarters,
      status: "affiliated",
      foundedYear: args.foundedYear,
      colors: args.colors,
      website: args.website,
      email: args.email,
      phoneNumber: args.phoneNumber,
    });
  },
});

/**
 * Update a club
 */
export const update = mutation({
  args: {
    clubId: v.id("clubs"),
    name: v.string(),
    shortName: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    headquarters: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
    colors: v.optional(v.array(v.string())),
    website: v.optional(v.string()),
    email: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const club = await ctx.db.get(args.clubId);
    if (!club) {
      throw new Error("Club not found");
    }

    await ctx.db.patch(args.clubId, {
      name: args.name,
      shortName: args.shortName,
      logoUrl: args.logoUrl,
      headquarters: args.headquarters,
      foundedYear: args.foundedYear,
      colors: args.colors,
      website: args.website,
      email: args.email,
      phoneNumber: args.phoneNumber,
    });

    return null;
  },
});

/**
 * Delete a club
 */
export const deleteClub = mutation({
  args: { clubId: v.id("clubs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const club = await ctx.db.get(args.clubId);
    if (!club) {
      throw new Error("Club not found");
    }

    await ctx.db.delete(args.clubId);
    return null;
  },
});

/**
 * Get club statistics
 */
export const getStatistics = query({
  args: { clubId: v.id("clubs") },
  returns: v.object({
    categoriesCount: v.number(),
    playersCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const club = await ctx.db.get(args.clubId);
    if (!club) {
      throw new Error("Club not found");
    }

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_clubId", (q) => q.eq("clubId", args.clubId))
      .collect();

    let playersCount = 0;
    for (const category of categories) {
      const categoryPlayers = await ctx.db
        .query("players")
        .withIndex("by_currentCategoryId", (q) =>
          q.eq("currentCategoryId", category._id)
        )
        .collect();
      playersCount += categoryPlayers.length;
    }

    return {
      categoriesCount: categories.length,
      playersCount,
    };
  },
});
