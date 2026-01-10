import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const clubStatusValidator = v.union(
  v.literal("affiliated"),
  v.literal("invited"),
  v.literal("suspended"),
);

export const create = mutation({
  args: {
    name: v.string(),
    nickname: v.string(),
    conferenceName: v.string(),
    orgSlug: v.string(),
    status: clubStatusValidator,
    logoStorageId: v.optional(v.id("_storage")),
    colors: v.optional(v.array(v.string())),
    colorNames: v.optional(v.array(v.string())),
  },
  returns: v.id("clubs"),
  handler: async (ctx, args): Promise<Id<"clubs">> => {
    let league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .unique();

    if (!league) {
      const newLeagueId = await ctx.db.insert("leagues", {
        name: args.orgSlug,
        slug: args.orgSlug,
        country: "Unknown",
        sportType: "basketball",
        status: "active",
      });
      league = await ctx.db.get(newLeagueId);
      if (!league) {
        throw new Error("Failed to create and retrieve league.");
      }
    }

    const conferenceId: Id<"conferences"> = await ctx.runMutation(
      internal.conferences.getOrCreate,
      {
        leagueId: league._id,
        name: args.conferenceName,
      },
    );

    let logoUrl: string | undefined;
    if (args.logoStorageId) {
      const url = await ctx.storage.getUrl(args.logoStorageId);
      logoUrl = url ?? undefined;
    }

    const clubId: Id<"clubs"> = await ctx.db.insert("clubs", {
      name: args.name,
      slug: args.nickname,
      shortName: args.nickname,
      leagueId: league._id,
      conferenceId: conferenceId,
      status: args.status,
      logoUrl,
      colors: args.colors,
      colorNames: args.colorNames,
    });

    return clubId;
  },
});

export const listByLeague = query({
  args: { orgSlug: v.string() },
  returns: v.array(
    v.object({
      _id: v.string(),
      name: v.string(),
      nickname: v.string(),
      logoUrl: v.optional(v.string()),
      conference: v.string(),
      delegate: v.object({
        name: v.string(),
        avatarUrl: v.string(),
      }),
      status: v.union(
        v.literal("affiliated"),
        v.literal("invited"),
        v.literal("suspended"),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .unique();

    if (!league) {
      return [];
    }

    const clubs = await ctx.db
      .query("clubs")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
      .collect();

    const clubsWithDetails = await Promise.all(
      clubs.map(async (club) => {
        let conferenceName = "N/A";
        if (club.conferenceId) {
          const conference = await ctx.db.get(club.conferenceId);
          conferenceName = conference?.name ?? "N/A";
        }

        return {
          _id: club._id.toString(),
          name: club.name,
          nickname: club.slug,
          logoUrl: club.logoUrl,
          conference: conferenceName,
          delegate: {
            name: "Delegate TBD",
            avatarUrl: "",
          },
          status: club.status,
        };
      }),
    );

    return clubsWithDetails;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("clubs"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      shortName: v.optional(v.string()),
      nickname: v.optional(v.string()),
      logoUrl: v.optional(v.string()),
      leagueId: v.id("leagues"),
      conferenceId: v.optional(v.id("conferences")),
      fifaId: v.optional(v.string()),
      headquarters: v.optional(v.string()),
      status: v.union(
        v.literal("affiliated"),
        v.literal("invited"),
        v.literal("suspended"),
      ),
      taxId: v.optional(v.string()),
      foundedYear: v.optional(v.number()),
      colors: v.optional(v.array(v.string())),
      colorNames: v.optional(v.array(v.string())),
      website: v.optional(v.string()),
      email: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
      conferenceName: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!club) {
      return null;
    }

    let conferenceName = "N/A";
    if (club.conferenceId) {
      const conference = await ctx.db.get(club.conferenceId);
      conferenceName = conference?.name ?? "N/A";
    }

    return {
      ...club,
      nickname: club.shortName,
      conferenceName,
    };
  },
});

export const update = mutation({
  args: {
    clubId: v.id("clubs"),
    name: v.optional(v.string()),
    nickname: v.optional(v.string()),
    conferenceName: v.optional(v.string()),
    status: v.optional(clubStatusValidator),
    logoStorageId: v.optional(v.id("_storage")),
    colors: v.optional(v.array(v.string())),
    colorNames: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const club = await ctx.db.get(args.clubId);
    if (!club) {
      throw new Error("Club not found");
    }

    const updates: Partial<{
      name: string;
      shortName: string;
      slug: string;
      conferenceId: Id<"conferences">;
      status: "affiliated" | "invited" | "suspended";
      logoUrl: string;
      colors: string[];
      colorNames: string[];
    }> = {};

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.nickname !== undefined) {
      updates.shortName = args.nickname;
      updates.slug = args.nickname;
    }

    if (args.conferenceName !== undefined && args.conferenceName !== "") {
      const conferenceId = await ctx.runMutation(
        internal.conferences.getOrCreate,
        {
          leagueId: club.leagueId,
          name: args.conferenceName,
        },
      );
      updates.conferenceId = conferenceId;
    }

    if (args.status !== undefined) {
      updates.status = args.status;
    }

    if (args.logoStorageId !== undefined) {
      const url = await ctx.storage.getUrl(args.logoStorageId);
      if (url) {
        updates.logoUrl = url;
      }
    }

    if (args.colors !== undefined) {
      updates.colors = args.colors;
    }

    if (args.colorNames !== undefined) {
      updates.colorNames = args.colorNames;
    }

    await ctx.db.patch(args.clubId, updates);

    return null;
  },
});
