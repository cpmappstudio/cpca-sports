import { ConvexError } from "convex/values";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { DOCUMENT_ATTACHMENT_MAX_SIZE } from "../lib/applications/document-attachments";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-File-Name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
export const options = httpAction(
  async () => new Response(null, { status: 204, headers }),
);

export const save = httpAction(async (ctx, request) => {
  const params = new URL(request.url).searchParams;
  const target = {
    applicationId: params.get("applicationId") as Id<"applications">,
    documentTypeId: params.get("documentTypeId") ?? "",
  };
  let storageId: Id<"_storage"> | undefined;
  try {
    const args = {
      ...target,
      sourceAttachmentId: params.get(
        "sourceAttachmentId",
      ) as Id<"documentAttachments">,
      expectedStorageId: params.get(
        "expectedStorageId",
      ) as Id<"_storage"> | null,
      saveId: params.get("saveId") ?? "",
    };
    const fileName = decodeURIComponent(
      request.headers.get("X-File-Name") ?? "",
    ).trim();
    if (
      !fileName ||
      fileName.length > 255 ||
      request.headers.get("Content-Type") !== "application/pdf"
    )
      throw new ConvexError("INVALID_PDF");
    const saved: Id<"_storage"> | null = await ctx.runQuery(
      internal.documentPdf.check,
      args,
    );
    if (saved) return Response.json({ storageId: saved }, { headers });
    const reader = request.body?.getReader();
    if (!reader) throw new ConvexError("INVALID_PDF");
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > DOCUMENT_ATTACHMENT_MAX_SIZE)
          throw new ConvexError("PDF_TOO_LARGE");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const blob = new Blob(chunks, { type: "application/pdf" });
    if (!size || !(await blob.slice(0, 5).text()).startsWith("%PDF-"))
      throw new ConvexError("INVALID_PDF");
    storageId = await ctx.storage.store(blob);
    const result: Id<"_storage"> = await ctx.runMutation(
      internal.documentPdf.complete,
      { ...args, fileName, storageId },
    );
    storageId = undefined;
    return Response.json({ storageId: result }, { headers });
  } catch (error) {
    if (storageId)
      await ctx.runMutation(internal.documentPdf.discard, {
        ...target,
        storageId,
      });
    const code = error instanceof ConvexError ? error.data : "PDF_SAVE_FAILED";
    return Response.json(
      { error: code },
      { status: code === "PDF_CONFLICT" ? 409 : 400, headers },
    );
  }
});
