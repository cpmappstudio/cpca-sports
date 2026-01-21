import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByLeagueSlug = query({
  args: { leagueSlug: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("tournaments"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      description: v.optional(v.string()),
      ageGroups: v.array(v.string()),
      conferences: v.array(v.string()),
      gender: v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("mixed"),
      ),
      registrationDeadline: v.optional(v.string()),
      location: v.optional(v.string()),
      startDate: v.optional(v.string()),
      endDate: v.optional(v.string()),
      status: v.union(
        v.literal("draft"),
        v.literal("upcoming"),
        v.literal("ongoing"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
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

    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
      .collect();

    return tournaments.map((tournament) => ({
      _id: tournament._id,
      _creationTime: tournament._creationTime,
      name: tournament.name,
      slug: tournament.slug,
      description: tournament.description,
      ageGroups: tournament.ageGroups,
      conferences: tournament.conferences || [],
      gender: tournament.gender,
      registrationDeadline: tournament.registrationDeadline,
      location: tournament.location,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      status: tournament.status,
    }));
  },
});

export const create = mutation({
  args: {
    leagueSlug: v.string(),
    name: v.string(),
    ageGroups: v.array(v.string()),
    conferences: v.array(v.string()),
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("mixed")),
    registrationDeadline: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!league) {
      throw new Error(`League not found: ${args.leagueSlug}`);
    }

    const slug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const currentYear = new Date().getFullYear().toString();

    const tournamentId = await ctx.db.insert("tournaments", {
      leagueId: league._id,
      name: args.name,
      slug,
      ageGroups: args.ageGroups,
      conferences: args.conferences,
      gender: args.gender,
      season: currentYear,
      registrationDeadline: args.registrationDeadline,
      status: "draft",
      enableDivisions: false,
    });

    return { success: true, tournamentId };
  },
});

export const listAvailableForClub = query({
  args: { clubSlug: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("tournaments"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      description: v.optional(v.string()),
      ageGroups: v.array(v.string()),
      conferences: v.array(v.string()),
      gender: v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("mixed"),
      ),
      registrationDeadline: v.optional(v.string()),
      status: v.union(
        v.literal("draft"),
        v.literal("upcoming"),
        v.literal("ongoing"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
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

    let conferenceName: string | null = null;
    if (club.conferenceId) {
      const conference = await ctx.db.get(club.conferenceId);
      conferenceName = conference?.name ?? null;
    }

    if (!conferenceName) {
      return [];
    }

    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", club.leagueId))
      .collect();

    const availableTournaments = tournaments.filter((tournament) => {
      const conferences = tournament.conferences || [];
      return (
        conferences.includes(conferenceName!) &&
        (tournament.status === "draft" || tournament.status === "upcoming")
      );
    });

    return availableTournaments.map((tournament) => ({
      _id: tournament._id,
      _creationTime: tournament._creationTime,
      name: tournament.name,
      slug: tournament.slug,
      description: tournament.description,
      ageGroups: tournament.ageGroups,
      conferences: tournament.conferences || [],
      gender: tournament.gender,
      registrationDeadline: tournament.registrationDeadline,
      status: tournament.status,
    }));
  },
});

export const remove = mutation({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);

    if (!tournament) {
      throw new Error("Tournament not found");
    }

    await ctx.db.delete(args.tournamentId);

    return { success: true };
  },
});
