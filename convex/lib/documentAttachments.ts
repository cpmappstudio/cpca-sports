import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";

export const documentAttachmentValidator = v.object({
  id: v.id("documentAttachments"),
  fileName: v.string(),
  contentType: v.string(),
  fileSize: v.number(),
  url: v.union(v.string(), v.null()),
});

export async function assertDocumentAttachmentAccess(
  ctx: QueryCtx | MutationCtx,
  attachmentId: Id<"documentAttachments">,
  organizationId: Id<"organizations">,
  applicationId?: Id<"applications">,
) {
  const attachment = await ctx.db.get("documentAttachments", attachmentId);
  if (
    !attachment?.storageId ||
    attachment.organizationId !== organizationId ||
    (attachment.applicationId && attachment.applicationId !== applicationId)
  )
    throw new Error("Attachment not available");
  if (!(await ctx.db.system.get("_storage", attachment.storageId)))
    throw new Error("Attachment file not found");
  return { ...attachment, storageId: attachment.storageId };
}

export async function getDocumentAttachment(
  ctx: QueryCtx | MutationCtx,
  attachmentId: Id<"documentAttachments"> | undefined,
) {
  if (!attachmentId) return undefined;
  const attachment = await ctx.db.get("documentAttachments", attachmentId);
  if (!attachment?.storageId) return undefined;
  return {
    id: attachment._id,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    fileSize: attachment.fileSize,
    url: await ctx.storage.getUrl(attachment.storageId),
  };
}

export async function scheduleDocumentAttachmentCleanup(
  ctx: MutationCtx,
  attachmentId: Id<"documentAttachments"> | undefined,
) {
  if (attachmentId)
    await ctx.scheduler.runAfter(0, internal.documentAttachments.cleanup, {
      attachmentId,
    });
}
