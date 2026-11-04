"use client";

import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  type Ref,
} from "react";
import { useLocale } from "next-intl";
import {
  PDFViewer,
  LockModeType,
  ZoomMode,
  type AnnotationPlugin,
  type AnnotationTool,
  type PdfInkAnnoObject,
  type DocumentManagerPlugin,
  type ExportPlugin,
  type FormPlugin,
  type HistoryPlugin,
  type PDFViewerConfig,
  type PluginRegistry,
} from "@embedpdf/react-pdf-viewer";

const inkBehavior: AnnotationTool<PdfInkAnnoObject>["behavior"] = {
  commitDelay: 0,
};

export type PdfViewerHandle = { exportPdf: () => Promise<Blob> };

export default function PdfViewer({
  src,
  name,
  readOnly = true,
  author,
  viewerRef,
  onReady,
  onChange,
  onError,
}: {
  src: string;
  name: string;
  readOnly?: boolean;
  author?: string;
  viewerRef?: Ref<PdfViewerHandle>;
  onReady?: () => void;
  onChange?: () => void;
  onError?: () => void;
}) {
  const locale = useLocale();
  const registry = useRef<PluginRegistry | null>(null);
  const unsubscribe = useRef<(() => void)[]>([]);
  const previewObserver = useRef<MutationObserver | null>(null);
  const callbacks = useRef({ onReady, onChange, onError });
  useLayoutEffect(() => {
    callbacks.current = { onReady, onChange, onError };
  }, [onReady, onChange, onError]);
  useEffect(
    () => () => {
      unsubscribe.current.forEach((stop) => stop());
      previewObserver.current?.disconnect();
    },
    [],
  );
  useImperativeHandle(
    viewerRef,
    () => ({
      async exportPdf() {
        const annotations = registry.current
          ?.getPlugin<AnnotationPlugin>("annotation")
          ?.provides();
        const exporter = registry.current
          ?.getPlugin<ExportPlugin>("export")
          ?.provides();
        if (!annotations || !exporter) throw new Error("PDF_NOT_READY");
        // Flush the active field's blur handler before exporting its last keystroke.
        const active = document.activeElement;
        if (active instanceof HTMLElement) {
          const input = active.shadowRoot?.activeElement;
          if (input instanceof HTMLElement) input.blur();
          active.blur();
        }
        await annotations.commit().toPromise();
        return new Blob([await exporter.saveAsCopy().toPromise()], {
          type: "application/pdf",
        });
      },
    }),
    [],
  );
  const config = useMemo<PDFViewerConfig>(
    () => ({
      src,
      tabBar: "never",
      zoom: { defaultZoomLevel: ZoomMode.FitWidth },
      documentManager: { maxDocuments: 1 },
      export: { defaultFileName: name },
      i18n: { defaultLocale: locale },
      fonts: { ui: null, signature: null },
      annotations: {
        annotationAuthor: author,
        tools: [
          { id: "ink", behavior: inkBehavior },
          { id: "inkHighlighter", behavior: inkBehavior },
        ],
        // Lock form design while leaving the fields available for filling.
        locked: readOnly
          ? { type: LockModeType.All }
          : { type: LockModeType.Include, categories: ["form"] },
      },
      permissions: {
        overrides: {
          modifyContents: false,
          assembleDocument: false,
          ...(readOnly ? { fillForms: false, modifyAnnotations: false } : {}),
        },
      },
      disabledCategories: [
        "document-open",
        "document-close",
        "document-protect",
        "form",
        "redaction",
        "signature",
        "stamp",
        "capture",
        "insert",
        ...(readOnly ? ["annotation", "history"] : []),
      ],
      theme: { preference: "system" },
    }),
    [src, name, locale, author, readOnly],
  );
  return (
    <div
      className="size-full"
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
    >
      <PDFViewer
        config={config}
        className="size-full"
        onInit={(container) => {
          if (!readOnly || !container.shadowRoot) return;
          // Locked widgets remain fillable in EmbedPDF; inert overlays protect preview without altering the PDF.
          const root = container.shadowRoot;
          const lockOverlays = () =>
            root
              .querySelectorAll<HTMLElement>('[data-no-interaction="true"]')
              .forEach((element) => {
                element.inert = true;
              });
          lockOverlays();
          previewObserver.current?.disconnect();
          previewObserver.current = new MutationObserver(lockOverlays);
          previewObserver.current.observe(root, {
            childList: true,
            subtree: true,
          });
        }}
        onReady={(value) => {
          unsubscribe.current.forEach((stop) => stop());
          registry.current = value;
          const documents = value
            .getPlugin<DocumentManagerPlugin>("document-manager")!
            .provides();
          const annotations = value
            .getPlugin<AnnotationPlugin>("annotation")!
            .provides();
          const notifyReady = () => {
            const doc = documents.getActiveDocument();
            if (!doc) return;
            if (doc.pageCount === 0) callbacks.current.onError?.();
            else if (Object.keys(annotations.getState().pages).length > 0)
              callbacks.current.onReady?.();
          };
          unsubscribe.current = [
            documents.onDocumentOpened(notifyReady),
            documents.onActiveDocumentChanged(notifyReady),
            documents.onDocumentError(() => callbacks.current.onError?.()),
            annotations.onAnnotationEvent((event) => {
              if (event.type === "loaded") notifyReady();
            }),
            value
              .getPlugin<HistoryPlugin>("history")!
              .provides()
              .onHistoryChange(() => callbacks.current.onChange?.()),
            value
              .getPlugin<FormPlugin>("form")!
              .provides()
              .onFieldValueChange(() => callbacks.current.onChange?.()),
          ];
          notifyReady();
        }}
      />
    </div>
  );
}
