import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * List all organizations (leagues and clubs) for SuperAdmin
 */
export const listAll = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.union(v.id("leagues"), v.id("clubs")),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      logoUrl: v.optional(v.string()),
      type: v.union(v.literal("league"), v.literal("club")),
      status: v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("affiliated"),
        v.literal("invited"),
        v.literal("suspended")
      ),
      country: v.optional(v.string()),
      region: v.optional(v.string()),
      clubCount: v.optional(v.number()),
      playerCount: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    // Get all leagues
    const leagues = await ctx.db.query("leagues").order("desc").collect();

    // Get all clubs
    const clubs = await ctx.db.query("clubs").order("desc").collect();

    // Count clubs per league
    const clubCountByLeague = new Map<string, number>();
    for (const club of clubs) {
      const count = clubCountByLeague.get(club.leagueId) || 0;
      clubCountByLeague.set(club.leagueId, count + 1);
    }

    // Map leagues to organization format
    const leagueOrgs = leagues.map((league) => ({
      _id: league._id as Id<"leagues"> | Id<"clubs">,
      _creationTime: league._creationTime,
      name: league.name,
      slug: league.slug,
      logoUrl: league.logoUrl,
      type: "league" as const,
      status: league.status as "active" | "inactive",
      country: league.country,
      region: league.region,
      clubCount: clubCountByLeague.get(league._id) || 0,
      playerCount: undefined,
    }));

    // Map clubs to organization format
    const clubOrgs = clubs.map((club) => ({
      _id: club._id as Id<"leagues"> | Id<"clubs">,
      _creationTime: club._creationTime,
      name: club.name,
      slug: club.slug,
      logoUrl: club.logoUrl,
      type: "club" as const,
      status: club.status as "affiliated" | "invited" | "suspended",
      country: undefined,
      region: undefined,
      clubCount: undefined,
      playerCount: undefined,
    }));

    // Combine and sort by creation time (most recent first)
    return [...leagueOrgs, ...clubOrgs].sort(
      (a, b) => b._creationTime - a._creationTime
    );
  },
});

/**
 * Get organization by slug (league or club)
 */
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      _id: v.string(),
      type: v.literal("league"),
      slug: v.string(),
      name: v.string(),
      logoUrl: v.optional(v.string()),
      clubId: v.null(),
    }),
    v.object({
      _id: v.string(),
      type: v.literal("club"),
      slug: v.string(),
      name: v.string(),
      logoUrl: v.optional(v.string()),
      clubId: v.id("clubs"),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Try to find as league first
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (league) {
      return {
        _id: league._id,
        type: "league" as const,
        slug: league.slug,
        name: league.name,
        logoUrl: league.logoUrl,
        clubId: null,
      };
    }

    // Try to find as club
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (club) {
      return {
        _id: club._id,
        type: "club" as const,
        slug: club.slug,
        name: club.name,
        logoUrl: club.logoUrl,
        clubId: club._id,
      };
    }

    return null;
  },
});