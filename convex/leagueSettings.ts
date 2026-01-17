import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Type for age category definition
const ageCategoryValidator = v.object({
  id: v.string(),
  name: v.string(),
  minAge: v.number(),
  maxAge: v.number(),
});

// Type for horizontal divisions config
const horizontalDivisionsValidator = v.object({
  enabled: v.boolean(),
  type: v.union(
    v.literal("alphabetic"),
    v.literal("greek"),
    v.literal("numeric"),
  ),
});

// Type for team config (age categories + enabled genders + horizontal divisions)
const teamConfigValidator = v.object({
  ageCategories: v.array(ageCategoryValidator),
  enabledGenders: v.array(
    v.union(v.literal("male"), v.literal("female"), v.literal("mixed")),
  ),
  horizontalDivisions: v.optional(horizontalDivisionsValidator),
});

export const getByLeagueSlug = query({
  args: { leagueSlug: v.string() },
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!league) {
      return null;
    }

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
      .unique();

    return settings;
  },
});

export const getTeamConfig = query({
  args: { leagueSlug: v.string() },
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!league) {
      return null;
    }

    const settings = await ctx.db
      .query("leagueSettings")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
      .unique();

    if (!settings || !settings.ageGroupDefinitions) {
      return {
        ageCategories: [],
        enabledGenders: ["male", "female"] as const,
        horizontalDivisions: {
          enabled: false,
          type: "alphabetic" as const,
        },
      };
    }

    try {
      const config = JSON.parse(settings.ageGroupDefinitions);
      return {
        ageCategories: config.ageCategories || [],
        enabledGenders: config.enabledGenders || ["male", "female"],
        horizontalDivisions: config.horizontalDivisions || {
          enabled: false,
          type: "alphabetic",
        },
      };
    } catch {
      return {
        ageCategories: [],
        enabledGenders: ["male", "female"] as const,
        horizontalDivisions: {
          enabled: false,
          type: "alphabetic" as const,
        },
      };
    }
  },
});

export const updateTeamConfig = mutation({
  args: {
    leagueSlug: v.string(),
    config: teamConfigValidator,
  },
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!league) {
      throw new Error(`League not found: ${args.leagueSlug}`);
    }

    const existingSettings = await ctx.db
      .query("leagueSettings")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
      .unique();

    const ageGroupDefinitions = JSON.stringify(args.config);

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, { ageGroupDefinitions });
      return { success: true, settingsId: existingSettings._id };
    } else {
      const settingsId = await ctx.db.insert("leagueSettings", {
        leagueId: league._id,
        ageGroupDefinitions,
      });
      return { success: true, settingsId };
    }
  },
});

export const addAgeCategory = mutation({
  args: {
    leagueSlug: v.string(),
    category: ageCategoryValidator,
  },
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!league) {
      throw new Error(`League not found: ${args.leagueSlug}`);
    }

    const existingSettings = await ctx.db
      .query("leagueSettings")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
      .unique();

    let config = {
      ageCategories: [] as Array<{
        id: string;
        name: string;
        minAge: number;
        maxAge: number;
      }>,
      enabledGenders: ["male", "female"] as string[],
      horizontalDivisions: {
        enabled: false,
        type: "alphabetic" as const,
      },
    };

    if (existingSettings?.ageGroupDefinitions) {
      try {
        const parsed = JSON.parse(existingSettings.ageGroupDefinitions);
        config = {
          ...config,
          ...parsed,
        };
      } catch {
        // Keep default config
      }
    }

    config.ageCategories.push(args.category);

    const ageGroupDefinitions = JSON.stringify(config);

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, { ageGroupDefinitions });
    } else {
      await ctx.db.insert("leagueSettings", {
        leagueId: league._id,
        ageGroupDefinitions,
      });
    }

    return { success: true };
  },
});

export const removeAgeCategory = mutation({
  args: {
    leagueSlug: v.string(),
    categoryId: v.string(),
  },
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!league) {
      throw new Error(`League not found: ${args.leagueSlug}`);
    }

    const existingSettings = await ctx.db
      .query("leagueSettings")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
      .unique();

    if (!existingSettings?.ageGroupDefinitions) {
      return { success: false, message: "No settings found" };
    }

    let config = JSON.parse(existingSettings.ageGroupDefinitions);
    config.ageCategories = config.ageCategories.filter(
      (cat: { id: string }) => cat.id !== args.categoryId,
    );

    await ctx.db.patch(existingSettings._id, {
      ageGroupDefinitions: JSON.stringify(config),
    });

    return { success: true };
  },
});

export const updateEnabledGenders = mutation({
  args: {
    leagueSlug: v.string(),
    enabledGenders: v.array(
      v.union(v.literal("male"), v.literal("female"), v.literal("mixed")),
    ),
  },
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!league) {
      throw new Error(`League not found: ${args.leagueSlug}`);
    }

    const existingSettings = await ctx.db
      .query("leagueSettings")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
      .unique();

    let config = {
      ageCategories: [] as Array<{
        id: string;
        name: string;
        minAge: number;
        maxAge: number;
      }>,
      enabledGenders: args.enabledGenders,
      horizontalDivisions: {
        enabled: false,
        type: "alphabetic" as const,
      },
    };

    if (existingSettings?.ageGroupDefinitions) {
      try {
        const parsed = JSON.parse(existingSettings.ageGroupDefinitions);
        config.ageCategories = parsed.ageCategories || [];
        config.horizontalDivisions =
          parsed.horizontalDivisions || config.horizontalDivisions;
      } catch {
        // Keep default config
      }
    }

    config.enabledGenders = args.enabledGenders;

    const ageGroupDefinitions = JSON.stringify(config);

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, { ageGroupDefinitions });
    } else {
      await ctx.db.insert("leagueSettings", {
        leagueId: league._id,
        ageGroupDefinitions,
      });
    }

    return { success: true };
  },
});

export const updateHorizontalDivisions = mutation({
  args: {
    leagueSlug: v.string(),
    horizontalDivisions: horizontalDivisionsValidator,
  },
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query("leagues")
      .withIndex("by_slug", (q) => q.eq("slug", args.leagueSlug))
      .unique();

    if (!league) {
      throw new Error(`League not found: ${args.leagueSlug}`);
    }

    const existingSettings = await ctx.db
      .query("leagueSettings")
      .withIndex("by_leagueId", (q) => q.eq("leagueId", league._id))
      .unique();

    let config = {
      ageCategories: [] as Array<{
        id: string;
        name: string;
        minAge: number;
        maxAge: number;
      }>,
      enabledGenders: ["male", "female"] as string[],
      horizontalDivisions: args.horizontalDivisions,
    };

    if (existingSettings?.ageGroupDefinitions) {
      try {
        const parsed = JSON.parse(existingSettings.ageGroupDefinitions);
        config.ageCategories = parsed.ageCategories || [];
        config.enabledGenders = parsed.enabledGenders || ["male", "female"];
      } catch {
        // Keep default config
      }
    }

    config.horizontalDivisions = args.horizontalDivisions;

    const ageGroupDefinitions = JSON.stringify(config);

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, { ageGroupDefinitions });
    } else {
      await ctx.db.insert("leagueSettings", {
        leagueId: league._id,
        ageGroupDefinitions,
      });
    }

    return { success: true };
  },
});
