import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const getOrCreate = internalMutation({
  args: { leagueId: v.id("leagues"), name: v.string() },
  returns: v.id("conferences"),
  handler: async (ctx, { leagueId, name }) => {
    const existing = await ctx.db
      .query("conferences")
      .withIndex("by_leagueId_and_name", (q) =>
        q.eq("leagueId", leagueId).eq("name", name),
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const slug = generateSlug(name);
    return await ctx.db.insert("conferences", { leagueId, name, slug });
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    shortName: v.optional(v.string()),
    leagueSlug: v.string(),
    region: v.optional(v.string()),
    divisions: v.optional(v.array(v.string())),
  },
  returns: v.id("conferences"),
  handler: async (ctx, args): Promise<Id<"conferences">> => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!league) {
      throw new Error("League not found");
    }

    const slug = generateSlug(args.shortName || args.name);

    const conferenceId = await ctx.db.insert("conferences", {
      name: args.name,
      slug,
      shortName: args.shortName,
      leagueId: league._id,
      region: args.region,
      divisions: args.divisions,
    });

    return conferenceId;
  },
});

export const update = mutation({
  args: {
    conferenceId: v.id("conferences"),
    name: v.optional(v.string()),
    shortName: v.optional(v.string()),
    region: v.optional(v.string()),
    divisions: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const conference = await ctx.db.get(args.conferenceId);
    if (!conference) {
      throw new Error("Conference not found");
    }

    const updates: Partial<{
      name: string;
      slug: string;
      shortName: string;
      region: string;
      divisions: string[];
    }> = {};

    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.shortName !== undefined) {
      updates.shortName = args.shortName;
      updates.slug = generateSlug(args.shortName);
    }
    if (args.region !== undefined) {
      updates.region = args.region;
    }
    if (args.divisions !== undefined) {
      updates.divisions = args.divisions;
    }

    await ctx.db.patch(args.conferenceId, updates);

    return null;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("conferences"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      shortName: v.optional(v.string()),
      leagueId: v.id("leagues"),
      region: v.optional(v.string()),
      divisions: v.optional(v.array(v.string())),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const conference = await ctx.db
      .query("conferences")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    return conference;
  },
});

export const listByLeague = query({
  args: { leagueSlug: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("conferences"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      shortName: v.optional(v.string()),
      region: v.optional(v.string()),
      divisions: v.optional(v.array(v.string())),
      teamsCount: v.number(),
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
    const conferences = await ctx.db
      .query("conferences")
      .withIndex("by_leagueId_and_name", (q) => q.eq("leagueId", league._id))
      .collect();

    const conferencesWithTeamCount = await Promise.all(
      conferences.map(async (conference) => {
        const clubs = await ctx.db
          .query("clubs")
          .withIndex("by_leagueId_and_conferenceId", (q) =>
            q.eq("leagueId", league._id).eq("conferenceId", conference._id),
          )
          .collect();

        return {
          _id: conference._id,
          _creationTime: conference._creationTime,
          name: conference.name,
          slug: conference.slug,
          shortName: conference.shortName,
          region: conference.region,
          divisions: conference.divisions,
          teamsCount: clubs.length,
        };
      }),
    );

    return conferencesWithTeamCount;
  },
});
