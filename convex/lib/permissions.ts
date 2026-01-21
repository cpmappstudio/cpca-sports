import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getCurrentUser, getUserRole } from "./auth";

/**
 * Require that the current user has access to the specified organization.
 * Returns the user if authorized.
 */
export async function requireOrganizationAccess(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
) {
  const user = await getCurrentUser(ctx);
  const role = await getUserRole(ctx, user._id);

  if (role === "SuperAdmin") {
    return user;
  }

  if (role === "Admin") {
    return user;
  }

  throw new Error("You do not have permission to access this organization");
}

/**
 * Require SuperAdmin role.
 */
export async function requireSuperAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  const role = await getUserRole(ctx, user._id);

  if (role !== "SuperAdmin") {
    throw new Error("SuperAdmin access required");
  }

  return user;
}