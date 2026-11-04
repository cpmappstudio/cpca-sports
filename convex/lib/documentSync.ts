import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

type DocumentMetadata = {
  attachmentId?: Id<"documentAttachments">;
  name?: string;
  description?: string;
  visibility: "required" | "optional" | "hidden";
};

export function documentMetadataMatches(
  left: DocumentMetadata,
  right: DocumentMetadata,
) {
  return (
    left.attachmentId === right.attachmentId &&
    left.name === right.name &&
    left.description === right.description &&
    left.visibility === right.visibility
  );
}

export async function scheduleProgramDocumentSync(
  ctx: MutationCtx,
  programId: Id<"programs">,
  actorUserId: Id<"users">,
): Promise<void> {
  await ctx.scheduler.runAfter(0, internal.documentSync.syncProgram, {
    programId,
    actorUserId,
  });
}
