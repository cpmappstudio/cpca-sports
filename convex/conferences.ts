import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

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

    return await ctx.db.insert("conferences", { leagueId, name });
  },
});

export const listByLeague = query({
  args: { leagueSlug: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("conferences"),
      _creationTime: v.number(),
      name: v.string(),
      leagueId: v.id("leagues"),
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
    return await ctx.db
      .query("conferences")
      .withIndex("by_leagueId_and_name", (q) => q.eq("leagueId", league._id))
      .collect();
  },
});
