// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { downloadDocument } from "./download-document";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("downloads the supplied blob with its filename and releases the temporary URL", async () => {
  vi.useFakeTimers();
  const blob = new Blob(["%PDF-test"], { type: "application/pdf" });
  const create = vi.fn(() => "blob:download");
  const revoke = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: revoke });
  let filename: string | undefined;
  let href: string | undefined;
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    filename = this.download;
    href = this.href;
  });
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await downloadDocument(blob, "activity-report.pdf");
  expect(fetcher).not.toHaveBeenCalled();
  expect(create).toHaveBeenCalledWith(blob);
  expect(filename).toBe("activity-report.pdf");
  expect(href).toBe("blob:download");
  expect(revoke).not.toHaveBeenCalled();
  vi.advanceTimersByTime(30_000);
  expect(revoke).toHaveBeenCalledWith("blob:download");
});

test("fetches external files before downloading and rejects unavailable files", async () => {
  vi.useFakeTimers();
  const blob = new Blob(["PDF"]);
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, blob: async () => blob })
    .mockResolvedValueOnce({ ok: false });
  const create = vi.fn(() => "blob:download");
  vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: vi.fn() });
  vi.stubGlobal("fetch", fetcher);
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  await downloadDocument("https://files.example/document.pdf", "document.pdf");
  expect(fetcher).toHaveBeenCalledWith("https://files.example/document.pdf");
  expect(create).toHaveBeenCalledWith(blob);
  await expect(
    downloadDocument("https://files.example/missing.pdf", "missing.pdf"),
  ).rejects.toThrow("DOCUMENT_DOWNLOAD_FAILED");
  expect(click).toHaveBeenCalledOnce();
});
