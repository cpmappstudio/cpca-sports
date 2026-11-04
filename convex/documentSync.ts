import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { defaultDocumentConfigValidator } from "./lib/defaultDocuments";
import { documentMetadataMatches } from "./lib/documentSync";
import { scheduleDocumentAttachmentCleanup } from "./lib/documentAttachments";
import { hasOrgAdminAccess } from "./lib/permissions";

export const initializeProgram = internalMutation({
  args: { programId: v.id("programs"), actorUserId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const program = await ctx.db.get("programs", args.programId);
    if (!program) throw new Error("Program not found");
    if (
      !(await hasOrgAdminAccess(ctx, args.actorUserId, program.organizationId))
    )
      throw new Error("Admin access required");
    const documents = await ctx.db
      .query("programDocumentConfig")
      .withIndex("byProgram", (q) => q.eq("programId", program._id))
      .collect();
    await ctx.scheduler.runAfter(0, internal.documentSync.syncProgram, {
      ...args,
      legacyBaseline: documents.map(
        ({ documentTypeId, name, description, visibility, attachmentId }) => ({
          attachmentId,
          documentTypeId,
          name,
          description,
          visibility,
        }),
      ),
    });
    return null;
  },
});

export const syncProgram = internalMutation({
  args: {
    programId: v.id("programs"),
    actorUserId: v.id("users"),
    cursor: v.optional(v.string()),
    legacyBaseline: v.optional(v.array(defaultDocumentConfigValidator)),
  },
  returns: v.object({
    processed: v.number(),
    added: v.number(),
    updated: v.number(),
    removed: v.number(),
    initialized: v.number(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const counts = {
      processed: 0,
      added: 0,
      updated: 0,
      removed: 0,
      initialized: 0,
    };
    const program = await ctx.db.get("programs", args.programId);
    if (!program) return { ...counts, isDone: true };
    const documents = await ctx.db
      .query("programDocumentConfig")
      .withIndex("byProgram", (q) => q.eq("programId", program._id))
      .collect();
    const currentByType = new Map(
      documents.map((document) => [document.documentTypeId, document]),
    );
    const baselineByType = new Map(
      args.legacyBaseline?.map((document) => [
        document.documentTypeId,
        document,
      ]),
    );
    const page = await ctx.db
      .query("applications")
      .withIndex("byProgram", (q) => q.eq("programId", program._id))
      .paginate({ cursor: args.cursor ?? null, numItems: 25 });
    const audit = { updatedAt: Date.now(), updatedBy: args.actorUserId };
    for (const application of page.page) {
      if (application.organizationId !== program.organizationId) continue;
      counts.processed++;
      const [configs, uploads] = await Promise.all([
        ctx.db
          .query("applicationDocumentConfig")
          .withIndex("byApplication", (q) =>
            q.eq("applicationId", application._id),
          )
          .collect(),
        ctx.db
          .query("applicationDocuments")
          .withIndex("byApplication", (q) =>
            q.eq("applicationId", application._id),
          )
          .collect(),
      ]);
      const configsByType = new Map(
        configs.map((config) => [config.documentTypeId, config]),
      );
      const uploadedTypes = new Set(
        uploads.map((upload) => upload.documentTypeId),
      );

      for (const config of configs) {
        const legacyPlaceholder =
          !config.isCustom &&
          !config.isCustomized &&
          !config.isRemoved &&
          !config.name &&
          !config.description &&
          !config.attachmentId;
        const baseline =
          baselineByType.get(config.documentTypeId) ??
          (legacyPlaceholder
            ? currentByType.get(config.documentTypeId)
            : undefined);
        if (config.sourceProgramId || !baseline) continue;
        const origin = {
          sourceProgramId: program._id,
          isCustomized:
            config.isCustomized === true ||
            !documentMetadataMatches(
              legacyPlaceholder
                ? {
                    ...config,
                    name: baseline.name,
                    description: baseline.description,
                  }
                : config,
              baseline,
            ),
        };
        await ctx.db.patch("applicationDocumentConfig", config._id, origin);
        configsByType.set(config.documentTypeId, { ...config, ...origin });
        counts.initialized++;
      }

      for (const document of documents) {
        const existing = configsByType.get(document.documentTypeId);
        const metadata = {
          attachmentId: document.attachmentId,
          name: document.name,
          description: document.description,
          visibility: document.visibility,
        };
        if (!existing) {
          await ctx.db.insert("applicationDocumentConfig", {
            applicationId: application._id,
            documentTypeId: document.documentTypeId,
            ...metadata,
            ...audit,
            sourceProgramId: program._id,
            isCustom: true,
          });
          counts.added++;
        } else if (
          existing.sourceProgramId === program._id &&
          !existing.isCustomized &&
          !existing.isRemoved &&
          !documentMetadataMatches(existing, metadata)
        ) {
          await ctx.db.patch("applicationDocumentConfig", existing._id, {
            ...metadata,
            ...audit,
          });
          if (existing.attachmentId !== metadata.attachmentId)
            await scheduleDocumentAttachmentCleanup(ctx, existing.attachmentId);
          counts.updated++;
        }
      }

      for (const config of configsByType.values()) {
        if (
          config.sourceProgramId !== program._id ||
          currentByType.has(config.documentTypeId) ||
          config.isCustomized ||
          config.isRemoved
        )
          continue;
        if (uploadedTypes.has(config.documentTypeId)) {
          if (config.visibility !== "optional") {
            await ctx.db.patch("applicationDocumentConfig", config._id, {
              visibility: "optional",
              ...audit,
            });
            counts.updated++;
          }
        } else {
          await ctx.db.delete("applicationDocumentConfig", config._id);
          await scheduleDocumentAttachmentCleanup(ctx, config.attachmentId);
          counts.removed++;
        }
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.documentSync.syncProgram, {
        ...args,
        cursor: page.continueCursor,
      });
    }
    return { ...counts, isDone: page.isDone };
  },
});
