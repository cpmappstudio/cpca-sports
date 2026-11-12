"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState, type ReactNode, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DocumentViewerHeader } from "./document-viewer-header";
import { DocumentViewerActions } from "./document-viewer-actions";
import type { PdfViewerHandle } from "./pdf-viewer";
import { downloadDocument } from "@/lib/documents/download-document";

const PdfViewer = dynamic(() => import("./pdf-viewer"), { ssr: false });
type PreviewFile = {
  fileName: string;
  contentType: string;
  url?: string | null;
};

export function DocumentFilePreview({
  file,
  ariaLabel,
  onOpen,
}: {
  file: PreviewFile;
  ariaLabel?: string;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!file.url && !onOpen)
    return (
      <span className="break-words text-sm text-muted-foreground">
        {file.fileName}
      </span>
    );
  const canPreview =
    file.contentType === "application/pdf" ||
    file.contentType.startsWith("image/");
  return (
    <>
      <Button
        type="button"
        variant="link"
        className="h-auto min-w-0 max-w-full cursor-pointer justify-start p-0 text-left whitespace-normal hover:underline focus-visible:underline"
        asChild
      >
        <a
          href={file.url ?? "#"}
          aria-label={ariaLabel}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            if (onOpen) {
              event.preventDefault();
              onOpen();
              return;
            }
            if (!canPreview) return;
            event.preventDefault();
            setOpen(true);
          }}
        >
          <FileText className="size-4 shrink-0" />
          <span className="min-w-0 break-words">{file.fileName}</span>
        </a>
      </Button>
      {open ? (
        <DocumentFilePreviewDialog file={file} onOpenChange={setOpen} />
      ) : null}
    </>
  );
}

type PreviewDialogProps = {
  file: PreviewFile;
  title?: string;
  headerContent?: ReactNode;
  renderActions?: (
    actions: ComponentProps<typeof DocumentViewerActions>,
  ) => ReactNode;
  closeDisabled?: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DocumentFilePreviewDialog(props: PreviewDialogProps) {
  return (
    <Dialog open onOpenChange={props.onOpenChange}>
      <DocumentFilePreviewContent key={props.file.url} {...props} />
    </Dialog>
  );
}

function DocumentFilePreviewContent({
  file,
  title,
  headerContent,
  renderActions,
  closeDisabled,
  onOpenChange,
}: PreviewDialogProps) {
  const t = useTranslations("Applications.documents.pdf");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [viewer, setViewer] = useState<PdfViewerHandle | null>(null);
  const isPdf = file.contentType === "application/pdf";
  const isImage = file.contentType.startsWith("image/");
  const unavailable = failed || !file.url || (!isPdf && !isImage);
  const actions: ComponentProps<typeof DocumentViewerActions> = {
    onDownload: file.url
      ? () => downloadDocument(file.url!, file.fileName)
      : undefined,
    onPrint: isPdf ? () => viewer!.printPdf() : undefined,
    printDisabled: !viewer || !ready || unavailable,
    openUrl: file.url ?? undefined,
  };
  return (
    <DialogContent
      showCloseButton={false}
      className="flex h-[95dvh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]"
      aria-describedby={undefined}
    >
      <DocumentViewerHeader
        title={title ?? file.fileName}
        description={title ? file.fileName : undefined}
        onClose={() => onOpenChange(false)}
        closeDisabled={closeDisabled}
        actions={
          renderActions ? (
            renderActions(actions)
          ) : (
            <DocumentViewerActions {...actions} />
          )
        }
      >
        {headerContent}
      </DocumentViewerHeader>
      <div className="relative min-h-0 flex-1">
        {!ready && !unavailable ? (
          <div
            role="status"
            className="absolute inset-0 z-10 flex items-center justify-center bg-background"
          >
            <Loader2 aria-hidden="true" className="mr-2 size-5 animate-spin" />
            {t("loading")}
          </div>
        ) : null}
        {unavailable ? (
          <div className="space-y-3 p-6 text-center">
            <p role="alert">{t("loadError")}</p>
          </div>
        ) : isPdf ? (
          <PdfViewer
            src={file.url!}
            name={file.fileName}
            viewerRef={setViewer}
            onReady={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        ) : (
          <Image
            src={file.url!}
            alt={file.fileName}
            fill
            unoptimized
            sizes="95vw"
            className="object-contain"
            onLoad={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </DialogContent>
  );
}
