import type { Id } from "@/convex/_generated/dataModel";

export const DOCUMENT_ATTACHMENT_ACCEPT =
  "application/pdf,image/jpeg,image/png";
export const DOCUMENT_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;

export type DocumentAttachment = {
  id: Id<"documentAttachments">;
  fileName: string;
  contentType: string;
  fileSize: number;
  url: string | null;
};

export function getDocumentAttachmentError(file: {
  type: string;
  size: number;
}) {
  if (!DOCUMENT_ATTACHMENT_ACCEPT.split(",").includes(file.type))
    return "invalidType";
  if (file.size <= 0 || file.size > DOCUMENT_ATTACHMENT_MAX_SIZE)
    return "invalidSize";
  return null;
}

export async function uploadDocumentFile(
  file: File,
  generateUploadUrl: () => Promise<string>,
) {
  const response = await fetch(await generateUploadUrl(), {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) throw new Error("Upload failed");
  const result: { storageId?: Id<"_storage"> } = await response.json();
  if (!result.storageId) throw new Error("Missing storage ID");
  return result.storageId;
}
