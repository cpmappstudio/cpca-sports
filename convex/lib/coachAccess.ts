import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getCurrentUser } from "./auth";
import { hasOrgAdminAccess } from "./permissions";

type Ctx = QueryCtx | MutationCtx;

export async function requireCoachAccess(
  ctx: Ctx,
  coachId: Id<"coaches">,
): Promise<{
  coach: Doc<"coaches">;
  user: Doc<"users">;
  isAdmin: boolean;
}> {
  const user = await getCurrentUser(ctx);
  const coach = await ctx.db.get(coachId);

  if (!coach) {
    throw new Error("Coach not found");
  }

  const isAdmin = await hasOrgAdminAccess(ctx, user._id, coach.organizationId);
  if (!isAdmin && coach.userId !== user._id) {
    throw new Error("You do not have access to this coach");
  }
  if (!user.isActive) {
    throw new Error("This user is inactive");
  }

  return { coach, user, isAdmin };
}

export async function requireCoachAdmin(ctx: Ctx, coachId: Id<"coaches">) {
  const access = await requireCoachAccess(ctx, coachId);
  if (!access.isAdmin) {
    throw new Error("Admin access required");
  }
  return access;
}

export async function requireCoachAdminForOrganization(
  ctx: Ctx,
  coachId: Id<"coaches">,
  organizationSlug: string,
) {
  const access = await requireCoachAdmin(ctx, coachId);
  const organization = await ctx.db
    .query("organizations")
    .withIndex("bySlug", (q) => q.eq("slug", organizationSlug))
    .unique();
  if (!organization || organization._id !== access.coach.organizationId) {
    throw new Error("Coach not found");
  }
  return access;
}

export async function requireProgramCoachAdmin(
  ctx: Ctx,
  programId: Id<"programs">,
) {
  const user = await getCurrentUser(ctx);
  const program = await ctx.db.get(programId);
  if (!program) {
    throw new Error("Program not found");
  }
  if (!(await hasOrgAdminAccess(ctx, user._id, program.organizationId))) {
    throw new Error("Admin access required");
  }
  return { program, user };
}
