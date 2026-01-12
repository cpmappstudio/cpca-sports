import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    return league;
  },
});

export const updateClerkOrgId = internalMutation({
  args: {
    slug: v.string(),
    clerkOrgId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!league) {
      return { success: false, message: `League ${args.slug} not found` };
    }

    await ctx.db.patch(league._id, { clerkOrgId: args.clerkOrgId });

    return {
      success: true,
      message: `Updated clerkOrgId for ${args.slug} to ${args.clerkOrgId}`,
    };
  },
});
