// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { useApplicationDocumentPdf } from "@/hooks/use-application-document-pdf";
import type { Id } from "@/convex/_generated/dataModel";
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: async () => "test-token" }),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const initial = {
  name: "Consent",
  author: "Applicant",
  sourceAttachmentId: "original" as Id<"documentAttachments">,
  storageId: null as Id<"_storage"> | null,
  url: "https://files.example/form.pdf",
  fileName: "form.pdf",
  needsRestart: false,
  lastSaveId: undefined as string | undefined,
};
function setup() {
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://test.convex.cloud");
  const onSaved = vi.fn();
  const exportPdf = vi.fn(
    async () => new Blob(["%PDF-filled"], { type: "application/pdf" }),
  );
  const view = renderHook(
    ({ latest }) =>
      useApplicationDocumentPdf({
        applicationId: "application" as Id<"applications">,
        documentTypeId: "consent",
        initial,
        latest,
        onSaved,
      }),
    { initialProps: { latest: initial as typeof initial | null } },
  );
  view.result.current.viewer.current = { exportPdf, printPdf: vi.fn(async () => {}) };
  act(() => {
    view.result.current.onReady();
  });
  act(() => {
    view.result.current.onChange();
  });
  return { ...view, onSaved, exportPdf };
}

test("an ambiguous network failure retries identical bytes and save ID without exporting twice", async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error("network"))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ storageId: "delivered" })),
    );
  vi.stubGlobal("fetch", fetcher);
  const { result, onSaved, exportPdf } = setup();
  await act(async () => {
    await result.current.save();
  });
  expect(result.current.error).toBe("saveError");
  expect(result.current.pending).toBe(true);
  await act(async () => {
    await result.current.save();
  });
  expect(exportPdf).toHaveBeenCalledOnce();
  expect(fetcher.mock.calls[0][0].href).toBe(fetcher.mock.calls[1][0].href);
  expect(fetcher.mock.calls[0][1].body).toBe(fetcher.mock.calls[1][1].body);
  expect(onSaved).toHaveBeenCalledOnce();
});

test("a changed source or revoked access keeps local work and blocks submission", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const { result, rerender } = setup();
  rerender({
    latest: {
      ...initial,
      sourceAttachmentId: "replacement" as Id<"documentAttachments">,
    },
  });
  expect(result.current.conflict).toBe(true);
  expect(result.current.document.sourceAttachmentId).toBe(
    initial.sourceAttachmentId,
  );
  expect(result.current.unsaved).toBe(true);
  await act(async () => {
    await result.current.save();
  });
  expect(fetcher).not.toHaveBeenCalled();
  rerender({ latest: null });
  expect(result.current.unsaved).toBe(true);
});

test("a concurrent submission conflicts even if neither side has a save ID", () => {
  const { result, rerender } = setup();
  rerender({
    latest: { ...initial, storageId: "new-delivery" as Id<"_storage"> },
  });
  expect(result.current.conflict).toBe(true);
});

test("double clicks send once; the editor's own reactive acknowledgement does not conflict", async () => {
  let finish!: (response: Response) => void;
  const fetcher = vi.fn<(url: URL) => Promise<Response>>(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  vi.stubGlobal("fetch", fetcher);
  const { result, rerender, onSaved } = setup();
  let first!: Promise<void>;
  await act(async () => {
    first = result.current.save();
    await result.current.save();
  });
  expect(fetcher).toHaveBeenCalledOnce();
  const saveId = fetcher.mock.calls[0]?.[0] as unknown;
  // Inspect the real URL rather than synthesizing a different retry operation.
  const url = new URL(String(saveId));
  rerender({
    latest: {
      ...initial,
      storageId: "delivered" as Id<"_storage">,
      lastSaveId: url.searchParams.get("saveId")!,
    },
  });
  expect(result.current.conflict).toBe(false);
  await act(async () => {
    finish(new Response(JSON.stringify({ storageId: "delivered" })));
    await first;
  });
  expect(onSaved).toHaveBeenCalledOnce();
});
