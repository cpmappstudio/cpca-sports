import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { hasOrgAdminAccess } from "./permissions";

/**
 * Helper to verify user has access to an application.
 */
export async function verifyApplicationAccess(
  ctx: QueryCtx | MutationCtx,
  applicationId: Id<"applications">,
  userId: Id<"users">,
  requireAdmin: boolean = false,
) {
  const application = await ctx.db.get(applicationId);
  if (!application) {
    throw new Error("Application not found");
  }

  const isOwner = application.userId === userId;
  const isAdmin = await hasOrgAdminAccess(
    ctx,
    userId,
    application.organizationId,
  );

  if (requireAdmin && !isAdmin) {
    throw new Error("Admin access required");
  }

  if (!isOwner && !isAdmin) {
    throw new Error("Unauthorized");
  }

  return { application, isOwner, isAdmin };
}
