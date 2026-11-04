import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { replaceProgramDocumentConfigs } from "../lib/defaultDocuments";
import { hasOrgAdminAccess } from "../lib/permissions";
import { LEGACY_APPLICATION_DOCUMENTS as defaults } from "./legacyDocuments";

export const seedDefaults = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    actorUserId: v.id("users"),
    programIds: v.array(v.id("programs")),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    programs: v.array(
      v.object({
        programId: v.id("programs"),
        name: v.string(),
        added: v.number(),
        skipped: v.boolean(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    if (!(await ctx.db.get("organizations", args.organizationId)))
      throw new Error("Organization not found");
    if (!(await hasOrgAdminAccess(ctx, args.actorUserId, args.organizationId)))
      throw new Error("Admin access required");
    if (
      args.programIds.length === 0 ||
      args.programIds.length > 50 ||
      new Set(args.programIds).size !== args.programIds.length
    )
      throw new Error("Invalid migration targets");

    const dryRun = args.dryRun !== false;
    const programs = [];
    for (const programId of args.programIds) {
      const program = await ctx.db.get("programs", programId);
      if (!program || program.organizationId !== args.organizationId)
        throw new Error("Program does not belong to this organization");
      if (program.isDraft || program.isActive === false)
        throw new Error("Program must be published and active");
      const existing = await ctx.db
        .query("programDocumentConfig")
        .withIndex("byProgram", (q) => q.eq("programId", programId))
        .first();
      const skipped = existing !== null;
      if (!dryRun && !skipped) {
        await replaceProgramDocumentConfigs(ctx, {
          programId,
          userId: args.actorUserId,
          documents: defaults,
        });
      }
      programs.push({
        programId,
        name: program.name,
        added: skipped ? 0 : defaults.length,
        skipped,
      });
    }
    return { dryRun, programs };
  },
});
