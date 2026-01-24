import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("mixed"),
);

const gameStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export const create = mutation({
  args: {
    orgSlug: v.string(),
    homeClubId: v.id("clubs"),
    awayClubId: v.id("clubs"),
    date: v.string(),
    startTime: v.string(),
    category: v.string(),
    gender: genderValidator,
    locationName: v.optional(v.string()),
    locationCoordinates: v.optional(v.array(v.number())),
  },
  returns: v.id("games"),
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .unique();

    if (!league) {
      throw new Error(`League not found: ${args.orgSlug}`);
    }

    // Validate that both clubs belong to this league
    const homeClub = await ctx.db.get(args.homeClubId);
    const awayClub = await ctx.db.get(args.awayClubId);

    if (!homeClub || homeClub.leagueId !== league._id) {
      throw new Error("Home club not found or does not belong to this league");
    }

    if (!awayClub || awayClub.leagueId !== league._id) {
      throw new Error("Away club not found or does not belong to this league");
    }

    if (args.homeClubId === args.awayClubId) {
      throw new Error("Home and away clubs must be different");
    }

    // Get current user profile for createdBy
    let createdBy = undefined;
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .unique();
      if (profile) {
        createdBy = profile._id;
      }
    }

    const gameId = await ctx.db.insert("games", {
      leagueId: league._id,
      homeClubId: args.homeClubId,
      awayClubId: args.awayClubId,
      date: args.date,
      startTime: args.startTime,
      category: args.category,
      gender: args.gender,
      locationName: args.locationName,
      locationCoordinates: args.locationCoordinates,
      status: "scheduled",
      createdBy,
    });

    return gameId;
  },
});

export const getById = query({
  args: { gameId: v.id("games") },
  returns: v.union(
    v.object({
      _id: v.string(),
      _creationTime: v.number(),
      homeTeam: v.object({
        _id: v.string(),
        name: v.string(),
        slug: v.string(),
        logoUrl: v.optional(v.string()),
        colors: v.optional(v.array(v.string())),
      }),
      awayTeam: v.object({
        _id: v.string(),
        name: v.string(),
        slug: v.string(),
        logoUrl: v.optional(v.string()),
        colors: v.optional(v.array(v.string())),
      }),
      date: v.string(),
      startTime: v.string(),
      category: v.string(),
      gender: genderValidator,
      locationName: v.optional(v.string()),
      locationCoordinates: v.optional(v.array(v.number())),
      status: gameStatusValidator,
      homeScore: v.optional(v.number()),
      awayScore: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);

    if (!game) {
      return null;
    }

    const homeClub = await ctx.db.get(game.homeClubId);
    const awayClub = await ctx.db.get(game.awayClubId);

    return {
      _id: game._id.toString(),
      _creationTime: game._creationTime,
      homeTeam: {
        _id: game.homeClubId.toString(),
        name: homeClub?.name ?? "Unknown",
        slug: homeClub?.slug ?? "",
        logoUrl: homeClub?.logoUrl,
        colors: homeClub?.colors,
      },
      awayTeam: {
        _id: game.awayClubId.toString(),
        name: awayClub?.name ?? "Unknown",
        slug: awayClub?.slug ?? "",
        logoUrl: awayClub?.logoUrl,
        colors: awayClub?.colors,
      },
      date: game.date,
      startTime: game.startTime,
      category: game.category,
      gender: game.gender,
      locationName: game.locationName,
      locationCoordinates: game.locationCoordinates,
      status: game.status,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
    };
  },
});

export const listByLeagueSlug = query({
  args: { leagueSlug: v.string() },
  returns: v.array(
    v.object({
      _id: v.string(),
      _creationTime: v.number(),
      homeTeamId: v.string(),
      homeTeamName: v.string(),
      awayTeamId: v.string(),
      awayTeamName: v.string(),
      date: v.string(),
      startTime: v.string(),
      category: v.string(),
      gender: genderValidator,
      locationName: v.optional(v.string()),
      locationCoordinates: v.optional(v.array(v.number())),
      status: gameStatusValidator,
      homeScore: v.optional(v.number()),
      awayScore: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!league) {
      return [];
    }

    const games = await ctx.db
      .query("games")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
      .collect();

    const gamesWithDetails = await Promise.all(
      games.map(async (game) => {
        const homeClub = await ctx.db.get(game.homeClubId);
        const awayClub = await ctx.db.get(game.awayClubId);

        return {
          _id: game._id.toString(),
          _creationTime: game._creationTime,
          homeTeamId: game.homeClubId.toString(),
          homeTeamName: homeClub?.name ?? "Unknown",
          awayTeamId: game.awayClubId.toString(),
          awayTeamName: awayClub?.name ?? "Unknown",
          date: game.date,
          startTime: game.startTime,
          category: game.category,
          gender: game.gender,
          locationName: game.locationName,
          locationCoordinates: game.locationCoordinates,
          status: game.status,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
        };
      }),
    );

    return gamesWithDetails;
  },
});

export const updateStatus = mutation({
  args: {
    gameId: v.id("games"),
    status: gameStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    await ctx.db.patch(args.gameId, { status: args.status });
    return null;
  },
});

export const updateScore = mutation({
  args: {
    gameId: v.id("games"),
    homeScore: v.number(),
    awayScore: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    await ctx.db.patch(args.gameId, {
      homeScore: args.homeScore,
      awayScore: args.awayScore,
    });
    return null;
  },
});
