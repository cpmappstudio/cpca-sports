import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getUserRole } from "./lib/auth";

/**
 * Get the current authenticated user's profile.
 */
export const me = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      clerkId: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      isActive: v.boolean(),
      role: v.union(
        v.literal("SuperAdmin"),
        v.literal("Admin"),
        v.literal("Member"),
        v.null(),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkdId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    const role = await getUserRole(ctx, user._id);

    return {
      ...user,
      role,
    };
  },
});

/**
 * Get a user by ID.
 */
export const getById = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      clerkId: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      isActive: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Upsert user from Clerk webhook (internal).
 * Handles both user.created and user.updated events.
 * Idempotent operation - safe to call multiple times.
 */
export const upsertFromClerk = internalMutation({
  args: { data: v.any() },
  returns: v.id("users"),
  handler: async (ctx, { data }) => {
    const clerkId = data.id;
    
    // Extract user data from Clerk payload
    const email =
      data.email_addresses?.[0]?.email_address ||
      data.primary_email_address ||
      `user_${clerkId}@temp.clerk`;
    
    const firstName = data.first_name || "";
    const lastName = data.last_name || "";

    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("byClerkdId", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email,
        firstName,
        lastName,
        isActive: true,
      });
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId,
      email,
      firstName,
      lastName,
      isActive: true,
    });
    return userId;
  },
});

/**
 * Deactivate user from Clerk webhook (internal).
 */
export const deactivateUser = internalMutation({
  args: { clerkId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("byClerkdId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, { isActive: false });
    }

    return null;
  },
});

/**
 * Assign organization role from Clerk webhook (internal).
 */
export const assignOrganizationRole = internalMutation({
  args: {
    clerkId: v.string(),
    organizationId: v.string(),
    clerkRole: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("byClerkdId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      return null;
    }

    const organization = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .unique();

    if (!organization) {
      return null;
    }

    const role =
      args.clerkRole === "org:admin"
        ? "Admin"
        : args.clerkRole === "org:member"
          ? "Member"
          : "Member";

    const existingRole = await ctx.db
      .query("userRoleAssigments")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("role"), role))
      .unique();

    if (!existingRole) {
      await ctx.db.insert("userRoleAssigments", {
        userId: user._id,
        role: role as "Admin" | "Member",
      });
    }

    return null;
  },
});
