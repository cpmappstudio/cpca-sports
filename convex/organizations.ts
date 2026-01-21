import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireSuperAdmin } from "./lib/permissions";

const organizationValidator = v.object({
  _id: v.id("organizations"),
  _creationTime: v.number(),
  organizationId: v.string(),
  name: v.string(),
  slug: v.string(),
});

/**
 * Get organization by slug.
 */
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(organizationValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("bySlug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

/**
 * Get organization by ID.
 */
export const getById = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(organizationValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.organizationId);
  },
});

/**
 * List all organizations (SuperAdmin only).
 */
export const listAll = query({
  args: {},
  returns: v.array(organizationValidator),
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    return await ctx.db.query("organizations").order("desc").collect();
  },
});

/**
 * Create organization (SuperAdmin only).
 */
export const create = mutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    slug: v.string(),
  },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const existingBySlug = await ctx.db
      .query("organizations")
      .withIndex("bySlug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existingBySlug) {
      throw new Error("Organization with this slug already exists");
    }

    return await ctx.db.insert("organizations", {
      organizationId: args.organizationId,
      name: args.name,
      slug: args.slug,
    });
  },
});

/**
 * Update organization (SuperAdmin only).
 */
export const update = mutation({
  args: {
    id: v.id("organizations"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);

    const organization = await ctx.db.get(args.id);
    if (!organization) {
      throw new Error("Organization not found");
    }

    if (args.slug && args.slug !== organization.slug) {
      const newSlug = args.slug;
      const existingBySlug = await ctx.db
        .query("organizations")
        .withIndex("bySlug", (q) => q.eq("slug", newSlug))
        .unique();

      if (existingBySlug) {
        throw new Error("Organization with this slug already exists");
      }
    }

    await ctx.db.patch(args.id, {
      ...(args.name && { name: args.name }),
      ...(args.slug && { slug: args.slug }),
    });

    return null;
  },
});

/**
 * Create organization from Clerk webhook (internal).
 */
export const createFromClerk = internalMutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    slug: v.string(),
  },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .unique();

    if (existing) {
      return existing._id;
    }

    const existingBySlug = await ctx.db
      .query("organizations")
      .withIndex("bySlug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existingBySlug) {
      throw new Error(
        `Organization with slug "${args.slug}" already exists`,
      );
    }

    return await ctx.db.insert("organizations", {
      organizationId: args.organizationId,
      name: args.name,
      slug: args.slug,
    });
  },
});

/**
 * Update organization from Clerk webhook (internal).
 */
export const updateFromClerk = internalMutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    slug: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const organization = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .unique();

    if (!organization) {
      console.error(
        `Organization not found for organizationId: ${args.organizationId}`,
      );
      return null;
    }

    if (args.slug !== organization.slug) {
      const existingBySlug = await ctx.db
        .query("organizations")
        .withIndex("bySlug", (q) => q.eq("slug", args.slug))
        .unique();

      if (existingBySlug && existingBySlug._id !== organization._id) {
        console.error(
          `Cannot update organization: slug "${args.slug}" already exists`,
        );
        return null;
      }
    }

    await ctx.db.patch(organization._id, {
      name: args.name,
      slug: args.slug,
    });

    return null;
  },
});
