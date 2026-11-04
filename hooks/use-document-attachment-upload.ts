"use client";

import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import type { FunctionArgs } from "convex/server";
import { api } from "@/convex/_generated/api";
import { uploadDocumentFile } from "@/lib/applications/document-attachments";

export function useDocumentAttachmentUpload(
  target: FunctionArgs<
    typeof api.documentAttachments.generateUploadUrl
  >["target"],
) {
  const generateUrl = useMutation(api.documentAttachments.generateUploadUrl);
  const register = useMutation(api.documentAttachments.register);
  return async (file: File) => {
    let attachmentId: Id<"documentAttachments"> | undefined;
    const storageId = await uploadDocumentFile(file, async () => {
      const upload = await generateUrl({
        target,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
      attachmentId = upload.attachmentId;
      return upload.uploadUrl;
    });
    if (!attachmentId) throw new Error("Missing attachment upload");
    return await register({ attachmentId, storageId });
  };
}
