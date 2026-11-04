import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  query,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./lib/auth";
import { verifyApplicationAccess } from "./lib/documentAccess";
import { assertDocumentAttachmentAccess } from "./lib/documentAttachments";
import { replaceApplicationDocument } from "./lib/applicationDocuments";
import { DOCUMENT_ATTACHMENT_MAX_SIZE } from "../lib/applications/document-attachments";

const targetArgs = {
  applicationId: v.id("applications"),
  documentTypeId: v.string(),
};
const pdfSaveArgs = {
  ...targetArgs,
  sourceAttachmentId: v.id("documentAttachments"),
  expectedStorageId: v.union(v.id("_storage"), v.null()),
  saveId: v.string(),
};

async function getTarget(
  ctx: QueryCtx,
  applicationId: Id<"applications">,
  documentTypeId: string,
) {
  const user = await getCurrentUser(ctx);
  if (!user.isActive) throw new ConvexError("PDF_UNAVAILABLE");
  const { application, isAdmin } = await verifyApplicationAccess(
    ctx,
    applicationId,
    user._id,
  );
  const config = await ctx.db
    .query("applicationDocumentConfig")
    .withIndex("byApplicationAndType", (q) =>
      q.eq("applicationId", applicationId).eq("documentTypeId", documentTypeId),
    )
    .unique();
  if (
    !config?.attachmentId ||
    config.isRemoved ||
    (config.visibility === "hidden" && !isAdmin)
  )
    throw new ConvexError("PDF_UNAVAILABLE");
  const source = await assertDocumentAttachmentAccess(
    ctx,
    config.attachmentId,
    application.organizationId,
    applicationId,
  );
  if (source.contentType !== "application/pdf")
    throw new ConvexError("PDF_UNAVAILABLE");
  const existing = await ctx.db
    .query("applicationDocuments")
    .withIndex("byApplicationAndType", (q) =>
      q.eq("applicationId", applicationId).eq("documentTypeId", documentTypeId),
    )
    .unique();
  return { user, config, source, existing };
}

export const get = query({
  args: targetArgs,
  returns: v.union(
    v.null(),
    v.object({
      name: v.string(),
      author: v.string(),
      sourceAttachmentId: v.id("documentAttachments"),
      storageId: v.union(v.id("_storage"), v.null()),
      url: v.string(),
      fileName: v.string(),
      needsRestart: v.boolean(),
      lastSaveId: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    // Losing access must leave an open editor's local work available for download.
    let target;
    try {
      target = await getTarget(ctx, args.applicationId, args.documentTypeId);
    } catch (error) {
      if (
        error instanceof ConvexError ||
        (error instanceof Error &&
          [
            "Not authenticated",
            "User not found in database",
            "Application not found",
            "Unauthorized",
            "Attachment not available",
            "Attachment file not found",
          ].includes(error.message))
      )
        return null;
      throw error;
    }
    const { user, config, source, existing } = target;
    const sourceUrl = await ctx.storage.getUrl(source.storageId);
    if (!sourceUrl) return null;
    const canResume =
      existing?.contentType === "application/pdf" &&
      (!existing.sourceAttachmentId ||
        existing.sourceAttachmentId === source._id);
    const url = canResume
      ? await ctx.storage.getUrl(existing.storageId)
      : sourceUrl;
    if (!url) return null;
    return {
      name: config.name ?? existing?.name ?? source.fileName,
      author: `${user.firstName} ${user.lastName}`.trim(),
      sourceAttachmentId: source._id,
      storageId: existing?.storageId ?? null,
      url,
      fileName: canResume ? existing.fileName : source.fileName,
      needsRestart: !!existing && !canResume,
      lastSaveId:
        existing?.uploadedBy === user._id ? existing.lastSaveId : undefined,
    };
  },
});

async function checkSave(
  ctx: QueryCtx,
  args: {
    applicationId: Id<"applications">;
    documentTypeId: string;
    sourceAttachmentId: Id<"documentAttachments">;
    expectedStorageId: Id<"_storage"> | null;
    saveId: string;
  },
) {
  if (!args.saveId || args.saveId.length > 100)
    throw new ConvexError("INVALID_PDF");
  const target = await getTarget(ctx, args.applicationId, args.documentTypeId);
  const alreadySaved =
    target.existing?.lastSaveId === args.saveId &&
    target.existing.uploadedBy === target.user._id;
  if (
    !alreadySaved &&
    (target.source._id !== args.sourceAttachmentId ||
      (target.existing?.storageId ?? null) !== args.expectedStorageId)
  )
    throw new ConvexError("PDF_CONFLICT");
  return { ...target, alreadySaved };
}

export const check = internalQuery({
  args: pdfSaveArgs,
  returns: v.union(v.id("_storage"), v.null()),
  handler: async (ctx, args) => {
    const { existing, alreadySaved } = await checkSave(ctx, args);
    return alreadySaved ? existing!.storageId : null;
  },
});

export const complete = internalMutation({
  args: { ...pdfSaveArgs, storageId: v.id("_storage"), fileName: v.string() },
  returns: v.id("_storage"),
  handler: async (ctx, args) => {
    const { user, config, existing, alreadySaved } = await checkSave(ctx, args);
    if (alreadySaved) {
      if (existing!.storageId !== args.storageId)
        await ctx.storage.delete(args.storageId);
      return existing!.storageId;
    }
    const file = await ctx.db.system.get("_storage", args.storageId);
    if (
      !file ||
      (file.contentType !== undefined &&
        file.contentType !== "application/pdf") ||
      file.size <= 0 ||
      file.size > DOCUMENT_ATTACHMENT_MAX_SIZE
    )
      throw new ConvexError("INVALID_PDF");
    await replaceApplicationDocument(
      ctx,
      {
        applicationId: args.applicationId,
        documentTypeId: args.documentTypeId,
        name: config.name ?? existing?.name ?? args.fileName,
        description: config.description,
        sourceAttachmentId: args.sourceAttachmentId,
        lastSaveId: args.saveId,
        storageId: args.storageId,
        fileName: args.fileName,
        contentType: "application/pdf",
        fileSize: file.size,
        uploadedBy: user._id,
        uploadedAt: Date.now(),
      },
      existing,
    );
    return args.storageId;
  },
});

export const discard = internalMutation({
  args: { ...targetArgs, storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("applicationDocuments")
      .withIndex("byApplicationAndType", (q) =>
        q
          .eq("applicationId", args.applicationId)
          .eq("documentTypeId", args.documentTypeId),
      )
      .unique();
    // A failed response can follow a successful save; keep its file.
    if (current?.storageId !== args.storageId)
      await ctx.storage.delete(args.storageId);
    return null;
  },
});
