import { afterEach, expect, test, vi } from "vitest";
import {
  DOCUMENT_ATTACHMENT_MAX_SIZE,
  getDocumentAttachmentError,
  uploadDocumentFile,
} from "./document-attachments";

afterEach(() => vi.unstubAllGlobals());

test("attachment validation accepts supported files and enforces the size boundaries", () => {
  for (const type of ["application/pdf", "image/jpeg", "image/png"])
    expect(
      getDocumentAttachmentError({ type, size: DOCUMENT_ATTACHMENT_MAX_SIZE }),
    ).toBeNull();
  expect(getDocumentAttachmentError({ type: "text/html", size: 1 })).toBe(
    "invalidType",
  );
  expect(getDocumentAttachmentError({ type: "application/pdf", size: 0 })).toBe(
    "invalidSize",
  );
  expect(
    getDocumentAttachmentError({
      type: "application/pdf",
      size: DOCUMENT_ATTACHMENT_MAX_SIZE + 1,
    }),
  ).toBe("invalidSize");
});

test("the shared upload checks HTTP errors and the storage response before returning a file ID", async () => {
  const file = new File(["test"], "form.pdf", { type: "application/pdf" });
  const generate = vi.fn().mockResolvedValue("https://upload.example.com");
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ storageId: "stored" })));
  vi.stubGlobal("fetch", fetch);
  expect(await uploadDocumentFile(file, generate)).toBe("stored");
  expect(fetch).toHaveBeenCalledWith("https://upload.example.com", {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  fetch.mockResolvedValue(new Response("error", { status: 500 }));
  await expect(uploadDocumentFile(file, generate)).rejects.toThrow(
    "Upload failed",
  );
  fetch.mockResolvedValue(new Response("{}"));
  await expect(uploadDocumentFile(file, generate)).rejects.toThrow(
    "Missing storage ID",
  );
});
