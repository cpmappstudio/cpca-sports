// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { createRef, useEffect, useRef } from "react";
import { afterEach, expect, test, vi } from "vitest";
const state = vi.hoisted(() => ({
  config: {} as Record<string, unknown>,
  fieldChange: (() => {}) as () => void,
  commit: vi.fn(),
  export: vi.fn(),
  stop: vi.fn(),
  shadow: null as ShadowRoot | null,
}));
vi.mock("next-intl", () => ({ useLocale: () => "es" }));
vi.mock("@embedpdf/react-pdf-viewer", () => ({
  LockModeType: { All: "all", Include: "include" },
  ZoomMode: { FitWidth: "fit-width" },
  PDFViewer: ({
    config,
    onReady,
    onInit,
  }: {
    config: Record<string, unknown>;
    onInit: (container: { shadowRoot: ShadowRoot }) => void;
    onReady: (value: unknown) => void;
  }) => {
    state.config = config;
    const ready = useRef(onReady);
    const init = useRef(onInit);
    useEffect(() => {
      const host = document.createElement("div");
      const shadowRoot = host.attachShadow({ mode: "open" });
      const overlay = document.createElement("div");
      overlay.dataset.noInteraction = "true";
      shadowRoot.append(overlay);
      state.shadow = shadowRoot;
      init.current({ shadowRoot });
      ready.current({
        getPlugin: () => ({
          provides: () => ({
            getActiveDocument: () => ({ pageCount: 1 }),
            getState: () => ({ pages: { 0: [] } }),
            onDocumentOpened: () => state.stop,
            onActiveDocumentChanged: () => state.stop,
            onDocumentError: () => state.stop,
            onAnnotationEvent: () => state.stop,
            onHistoryChange: () => state.stop,
            onFieldValueChange: (callback: () => void) => {
              state.fieldChange = callback;
              return state.stop;
            },
            commit: () => ({ toPromise: state.commit }),
            saveAsCopy: () => ({ toPromise: state.export }),
          }),
        }),
      });
    }, []);
    return <div />;
  },
}));
import PdfViewer, { type PdfViewerHandle } from "./pdf-viewer";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("editing enables native filling, locks form design, and observes field changes", () => {
  const change = vi.fn();
  const ready = vi.fn();
  const view = render(
    <PdfViewer
      src="form.pdf"
      name="form.pdf"
      readOnly={false}
      onChange={change}
      onReady={ready}
    />,
  );
  expect(state.config.annotations).toMatchObject({
    locked: { type: "include", categories: ["form"] },
  });
  expect(state.config.permissions).toEqual({
    overrides: { modifyContents: false, assembleDocument: false },
  });
  expect(ready).toHaveBeenCalledOnce();
  act(() => state.fieldChange());
  expect(change).toHaveBeenCalledOnce();
  view.unmount();
  expect(state.stop).toHaveBeenCalledTimes(6);
});

test("preview prevents changes to native fields as well as annotations", () => {
  render(<PdfViewer src="form.pdf" name="form.pdf" />);
  expect(state.config.permissions).toMatchObject({
    overrides: { fillForms: false, modifyAnnotations: false },
  });
  expect(state.config.annotations).toMatchObject({ locked: { type: "all" } });
  expect((state.shadow!.firstElementChild as HTMLElement).inert).toBe(true);
});

test("export waits for pending changes; a failed commit never exports an incomplete PDF", async () => {
  let finish!: () => void;
  state.commit.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  state.export.mockResolvedValueOnce(
    new TextEncoder().encode("%PDF-filled").buffer,
  );
  const viewer = createRef<PdfViewerHandle>();
  render(<PdfViewer src="form.pdf" name="form.pdf" viewerRef={viewer} />);
  const exporting = viewer.current!.exportPdf();
  expect(state.export).not.toHaveBeenCalled();
  finish();
  const blob = await exporting;
  expect(blob.type).toBe("application/pdf");
  expect(blob.size).toBe(11);
  state.export.mockClear();
  state.commit.mockRejectedValueOnce(new Error("commit failed"));
  await expect(viewer.current!.exportPdf()).rejects.toThrow("commit failed");
  expect(state.export).not.toHaveBeenCalled();
});
