// @vitest-environment node
import { expect, test, vi } from "vitest";
import {
  getSavableDocumentConfigs,
  mapEditableDocumentConfigs,
  serializeEditableDocumentConfigs,
  uploadPendingDocumentAttachments,
} from "./document-default-types";
import type { DocumentAttachment } from "@/lib/applications/document-attachments";

const attachment: DocumentAttachment = {
  id: "attachment" as DocumentAttachment["id"],
  fileName: "form.pdf",
  contentType: "application/pdf",
  fileSize: 4,
  url: "https://files.example.com/form.pdf",
};
const config = {
  documentTypeId: "form",
  name: "Consent",
  visibility: "required" as const,
  attachmentId: attachment.id,
  attachment,
};

test("mapping and saving preserve attachment references without sending URLs or browser files to Convex", async () => {
  const mapped = mapEditableDocumentConfigs([config]);
  expect(mapped[0].attachment).toEqual(attachment);
  const pendingFile = new File(["new"], "new.pdf", { type: "application/pdf" });
  const pending = [{ ...mapped[0], pendingFile }];
  expect(serializeEditableDocumentConfigs(pending)).not.toBe(
    serializeEditableDocumentConfigs(mapped),
  );
  const replacement = {
    ...attachment,
    id: "new" as DocumentAttachment["id"],
    fileName: "new.pdf",
  };
  const upload = vi.fn().mockResolvedValue(replacement);
  const resolved = await uploadPendingDocumentAttachments(pending, upload);
  expect(upload).toHaveBeenCalledOnce();
  expect(pending[0].pendingFile).toBe(pendingFile);
  expect(resolved![0].pendingFile).toBeUndefined();
  expect(getSavableDocumentConfigs(resolved)).toEqual([
    {
      documentTypeId: "form",
      name: "Consent",
      visibility: "required",
      attachmentId: replacement.id,
    },
  ]);
  expect(JSON.stringify(getSavableDocumentConfigs(resolved))).not.toContain(
    "url",
  );
  await uploadPendingDocumentAttachments(resolved, upload);
  expect(upload).toHaveBeenCalledOnce();
});

test("an upload failure preserves the existing reference and pending selection for retry", async () => {
  const pendingFile = new File(["new"], "new.pdf", { type: "application/pdf" });
  const pending = [{ ...config, pendingFile }];
  await expect(
    uploadPendingDocumentAttachments(
      pending,
      vi.fn().mockRejectedValue(new Error("network")),
    ),
  ).rejects.toThrow("network");
  expect(pending[0].attachmentId).toBe(attachment.id);
  expect(pending[0].pendingFile).toBe(pendingFile);
  expect(
    serializeEditableDocumentConfigs([
      { ...config, attachment: { ...attachment, url: "new-url" } },
    ]),
  ).toBe(serializeEditableDocumentConfigs([config]));
});
