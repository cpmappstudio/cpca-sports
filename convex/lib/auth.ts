import {
  QueryCtx,
  MutationCtx,
} from "../_generated/server";

/**
 * Get the current authenticated user from Clerk identity.
 * Throws if not authenticated or user not found in DB.
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("byClerkdId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("User not found in database");
  }

  return user;
}

/**
 * Get the current user or null if not authenticated.
 * Use for optional auth scenarios.
 */
export async function getCurrentUserOrNull(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("byClerkdId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/**
 * Get user role assignment.
 */
export async function getUserRole(ctx: QueryCtx | MutationCtx, userId: string) {
  const assignment = await ctx.db
    .query("userRoleAssigments")
    .withIndex("byUserId", (q) => q.eq("userId", userId as any))
    .first();

  return assignment?.role ?? null;
}

/**
 * Check if user has admin or superadmin role.
 */
export async function isAdmin(ctx: QueryCtx | MutationCtx, userId: string) {
  const role = await getUserRole(ctx, userId);
  return role === "Admin" || role === "SuperAdmin";
}

/**
 * Require admin role, throws if not admin.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  const admin = await isAdmin(ctx, user._id);

  if (!admin) {
    throw new Error("Unauthorized: Admin role required");
  }

  return user;
}