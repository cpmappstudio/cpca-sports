import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * List categories for select dropdowns (lightweight, no joins)
 * Use this for forms that just need category name/ageGroup
 */
export const listForSelect = query({
  args: { clubSlug: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("categories"),
      name: v.string(),
      ageGroup: v.string(),
      gender: v.union(v.literal("male"), v.literal("female"), v.literal("mixed")),
      status: v.union(v.literal("active"), v.literal("inactive")),
    })
  ),
  handler: async (ctx, args) => {
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.clubSlug))
      .unique();

    if (!club) return [];

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_clubId", (q) => q.eq("clubId", club._id))
      .collect();

    return categories
      .filter(c => c.status === "active")
      .map(c => ({
        _id: c._id,
        name: c.name,
        ageGroup: c.ageGroup,
        gender: c.gender,
        status: c.status,
      }));
  },
});

/**
 * List categories by club slug with club metadata
 * Optimized: Single query replaces getBySlug + listByClubId
 * Returns null if club not found
 */
export const listByClubSlug = query({
  args: { clubSlug: v.string() },
  returns: v.union(
    v.object({
      club: v.object({
        _id: v.id("clubs"),
        name: v.string(),
        slug: v.string(),
      }),
      teams: v.array(
        v.object({
          _id: v.id("categories"),
          _creationTime: v.number(),
          name: v.string(),
          ageGroup: v.string(),
          gender: v.union(v.literal("male"), v.literal("female"), v.literal("mixed")),
          status: v.union(v.literal("active"), v.literal("inactive")),
          technicalDirectorId: v.optional(v.id("profiles")),
          technicalDirectorName: v.optional(v.string()),
          playerCount: v.number(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.clubSlug))
      .unique();

    if (!club) return null;

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_clubId", (q) => q.eq("clubId", club._id))
      .collect();

    if (categories.length === 0) {
      return {
        club: { _id: club._id, name: club.name, slug: club.slug },
        teams: [],
      };
    }

    // Collect all unique technicalDirectorIds to batch fetch
    const tdIds = [...new Set(
      categories
        .map(c => c.technicalDirectorId)
        .filter((id): id is Id<"profiles"> => id !== undefined)
    )];

    // Batch fetch all technical directors
    const tdProfiles = await Promise.all(tdIds.map(id => ctx.db.get(id)));
    const tdMap = new Map(
      tdIds.map((id, i) => [id, tdProfiles[i]])
    );

    // Fetch player counts in parallel
    const categoryIds = categories.map(c => c._id);
    const playerCountsPromises = categoryIds.map(async (catId) => {
      const players = await ctx.db
        .query("players")
        .withIndex("by_currentCategoryId", (q) => q.eq("currentCategoryId", catId))
        .collect();
      return { categoryId: catId, count: players.length };
    });

    const playerCounts = await Promise.all(playerCountsPromises);
    const countMap = new Map(playerCounts.map(p => [p.categoryId, p.count]));

    const teams = categories.map((category) => {
      const td = category.technicalDirectorId
        ? tdMap.get(category.technicalDirectorId)
        : undefined;

      return {
        _id: category._id,
        _creationTime: category._creationTime,
        name: category.name,
        ageGroup: category.ageGroup,
        gender: category.gender,
        status: category.status,
        technicalDirectorId: category.technicalDirectorId,
        technicalDirectorName: td?.displayName || td?.email,
        playerCount: countMap.get(category._id) || 0,
      };
    });

    return {
      club: { _id: club._id, name: club.name, slug: club.slug },
      teams,
    };
  },
});

/**
 * Get category by ID
 */
export const getById = query({
  args: { categoryId: v.id("categories") },
  returns: v.union(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      name: v.string(),
      ageGroup: v.string(),
      gender: v.union(v.literal("male"), v.literal("female"), v.literal("mixed")),
      status: v.union(v.literal("active"), v.literal("inactive")),
      clubId: v.id("clubs"),
      technicalDirectorId: v.optional(v.id("profiles")),
      assistantCoachIds: v.optional(v.array(v.id("profiles"))),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.categoryId);
  },
});

/**
 * List categories by club ID
 * Optimized: Fetches all players once and counts by category in memory
 */
export const listByClubId = query({
  args: { clubId: v.id("clubs") },
  returns: v.array(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      name: v.string(),
      ageGroup: v.string(),
      gender: v.union(v.literal("male"), v.literal("female"), v.literal("mixed")),
      status: v.union(v.literal("active"), v.literal("inactive")),
      technicalDirectorId: v.optional(v.id("profiles")),
      technicalDirectorName: v.optional(v.string()),
      playerCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_clubId", (q) => q.eq("clubId", args.clubId))
      .collect();

    if (categories.length === 0) return [];

    // Collect all unique technicalDirectorIds to batch fetch
    const tdIds = [...new Set(
      categories
        .map(c => c.technicalDirectorId)
        .filter((id): id is Id<"profiles"> => id !== undefined)
    )];

    // Batch fetch all technical directors
    const tdProfiles = await Promise.all(tdIds.map(id => ctx.db.get(id)));
    const tdMap = new Map(
      tdIds.map((id, i) => [id, tdProfiles[i]])
    );

    // Fetch all players for all categories in one query per category
    // Since Convex doesn't support OR queries, we need to count per category
    // But we can parallelize with Promise.all
    const categoryIds = categories.map(c => c._id);
    const playerCountsPromises = categoryIds.map(async (catId) => {
      const players = await ctx.db
        .query("players")
        .withIndex("by_currentCategoryId", (q) => q.eq("currentCategoryId", catId))
        .collect();
      return { categoryId: catId, count: players.length };
    });

    const playerCounts = await Promise.all(playerCountsPromises);
    const countMap = new Map(playerCounts.map(p => [p.categoryId, p.count]));

    return categories.map((category) => {
      const td = category.technicalDirectorId
        ? tdMap.get(category.technicalDirectorId)
        : undefined;

      return {
        _id: category._id,
        _creationTime: category._creationTime,
        name: category.name,
        ageGroup: category.ageGroup,
        gender: category.gender,
        status: category.status,
        technicalDirectorId: category.technicalDirectorId,
        technicalDirectorName: td?.displayName || td?.email,
        playerCount: countMap.get(category._id) || 0,
      };
    });
  },
});

/**
 * Create a new category
 */
export const create = mutation({
  args: {
    clubId: v.id("clubs"),
    name: v.string(),
    ageGroup: v.string(),
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("mixed")),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const club = await ctx.db.get(args.clubId);
    if (!club) {
      throw new Error("Club not found");
    }

    return await ctx.db.insert("categories", {
      clubId: args.clubId,
      name: args.name,
      ageGroup: args.ageGroup,
      gender: args.gender,
      status: args.status,
    });
  },
});

/**
 * Update a category
 */
export const update = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.string(),
    ageGroup: v.string(),
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("mixed")),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    await ctx.db.patch(args.categoryId, {
      name: args.name,
      ageGroup: args.ageGroup,
      gender: args.gender,
      status: args.status,
    });

    return null;
  },
});

/**
 * Delete a category
 */
export const deleteCategory = mutation({
  args: { categoryId: v.id("categories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check if category has players
    const players = await ctx.db
      .query("players")
      .withIndex("by_currentCategoryId", (q) =>
        q.eq("currentCategoryId", args.categoryId)
      )
      .collect();

    if (players.length > 0) {
      throw new Error(`Cannot delete category with ${players.length} active players`);
    }

    await ctx.db.delete(args.categoryId);
    return null;
  },
});

/**
 * Assign technical director to category
 */
export const assignTechnicalDirector = mutation({
  args: {
    categoryId: v.id("categories"),
    technicalDirectorId: v.id("profiles"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    const technicalDirector = await ctx.db.get(args.technicalDirectorId);
    if (!technicalDirector) {
      throw new Error("Technical director not found");
    }

    await ctx.db.patch(args.categoryId, {
      technicalDirectorId: args.technicalDirectorId,
    });

    return null;
  },
});