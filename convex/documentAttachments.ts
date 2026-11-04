import { v, type Infer } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./lib/auth";
import { hasOrgAdminAccess } from "./lib/permissions";
import {
  documentAttachmentValidator,
  getDocumentAttachment,
} from "./lib/documentAttachments";
import { getDocumentAttachmentError } from "../lib/applications/document-attachments";

const targetValidator = v.union(
  v.object({ programId: v.id("programs") }),
  v.object({ templateId: v.id("formTemplates") }),
  v.object({ applicationId: v.id("applications") }),
);
type Target = Infer<typeof targetValidator>;

async function requireTargetAdmin(ctx: MutationCtx, target: Target) {
  const user = await getCurrentUser(ctx);
  const entity =
    "programId" in target
      ? await ctx.db.get("programs", target.programId)
      : "templateId" in target
        ? await ctx.db.get("formTemplates", target.templateId)
        : await ctx.db.get("applications", target.applicationId);
  if (!entity) throw new Error("Document destination not found");
  if (!(await hasOrgAdminAccess(ctx, user._id, entity.organizationId)))
    throw new Error("Admin access required");
  return { user, organizationId: entity.organizationId };
}

export const generateUploadUrl = mutation({
  args: {
    target: targetValidator,
    fileName: v.string(),
    contentType: v.string(),
    fileSize: v.number(),
  },
  returns: v.object({
    uploadUrl: v.string(),
    attachmentId: v.id("documentAttachments"),
  }),
  handler: async (ctx, args) => {
    const { user, organizationId } = await requireTargetAdmin(ctx, args.target);
    const fileName = args.fileName.trim();
    if (
      !fileName ||
      getDocumentAttachmentError({
        type: args.contentType,
        size: args.fileSize,
      })
    )
      throw new Error("Invalid attachment file");
    const attachmentId = await ctx.db.insert("documentAttachments", {
      organizationId,
      ...("applicationId" in args.target ? args.target : {}),
      fileName,
      contentType: args.contentType,
      fileSize: args.fileSize,
      uploadedBy: user._id,
    });
    // Reclaim uploads from abandoned or failed edits after a day.
    await ctx.scheduler.runAfter(
      24 * 60 * 60 * 1000,
      internal.documentAttachments.cleanup,
      { attachmentId },
    );
    return { uploadUrl: await ctx.storage.generateUploadUrl(), attachmentId };
  },
});

export const register = mutation({
  args: {
    attachmentId: v.id("documentAttachments"),
    storageId: v.id("_storage"),
  },
  returns: documentAttachmentValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const attachment = await ctx.db.get(
      "documentAttachments",
      args.attachmentId,
    );
    if (
      !attachment ||
      attachment.uploadedBy !== user._id ||
      !(await hasOrgAdminAccess(ctx, user._id, attachment.organizationId))
    )
      throw new Error("Attachment upload not available");
    const file = await ctx.db.system.get("_storage", args.storageId);
    if (
      !file ||
      file._creationTime < attachment._creationTime ||
      file.contentType !== attachment.contentType ||
      file.size !== attachment.fileSize ||
      getDocumentAttachmentError({
        type: file.contentType ?? "",
        size: file.size,
      })
    )
      throw new Error("Invalid attachment file");
    if (attachment.storageId && attachment.storageId !== args.storageId)
      throw new Error("Attachment upload already completed");
    const existing = await ctx.db
      .query("documentAttachments")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .unique();
    if (existing && existing._id !== attachment._id)
      throw new Error("File already registered");
    await ctx.db.patch("documentAttachments", attachment._id, {
      storageId: args.storageId,
    });
    return (await getDocumentAttachment(ctx, attachment._id))!;
  },
});

export const cleanup = internalMutation({
  args: { attachmentId: v.id("documentAttachments") },
  returns: v.null(),
  handler: async (ctx, { attachmentId }) => {
    const attachment = await ctx.db.get("documentAttachments", attachmentId);
    if (!attachment) return null;
    const references = await Promise.all([
      ctx.db
        .query("applicationDocuments")
        .withIndex("by_sourceAttachmentId", (q) =>
          q.eq("sourceAttachmentId", attachmentId),
        )
        .first(),
      ctx.db
        .query("programDocumentConfig")
        .withIndex("by_attachmentId", (q) => q.eq("attachmentId", attachmentId))
        .first(),
      ctx.db
        .query("templateDocumentConfig")
        .withIndex("by_attachmentId", (q) => q.eq("attachmentId", attachmentId))
        .first(),
      ctx.db
        .query("applicationDocumentConfig")
        .withIndex("by_attachmentId", (q) => q.eq("attachmentId", attachmentId))
        .first(),
    ]);
    if (!references.some(Boolean)) {
      if (attachment.storageId) await ctx.storage.delete(attachment.storageId);
      await ctx.db.delete("documentAttachments", attachmentId);
    }
    return null;
  },
});
