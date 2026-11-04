import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { scheduleDocumentAttachmentCleanup } from "./documentAttachments";

type Submission = Omit<
  Doc<"applicationDocuments">,
  | "_id"
  | "_creationTime"
  | "status"
  | "reviewedBy"
  | "reviewedAt"
  | "rejectionReason"
>;

export async function replaceApplicationDocument(
  ctx: MutationCtx,
  submission: Submission,
  existing: Doc<"applicationDocuments"> | null,
) {
  if (existing) {
    await ctx.storage.delete(existing.storageId);
    await ctx.db.delete(existing._id);
    await scheduleDocumentAttachmentCleanup(ctx, existing.sourceAttachmentId);
  }
  return await ctx.db.insert("applicationDocuments", {
    ...submission,
    status: "pending",
  });
}
