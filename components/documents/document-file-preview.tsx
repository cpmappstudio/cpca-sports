"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export function DocumentFilePreviewDialog({
  file,
  title,
  headerContent,
  actions,
  onOpenChange,
}: {
  file: PreviewFile;
  title?: string;
  headerContent?: ReactNode;
  actions?: ReactNode;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[95dvh] max-w-[calc(100%-1rem)] flex-col gap-3 overflow-hidden p-3 sm:max-w-[95vw]"
        aria-describedby={undefined}
      >
        <header className="max-h-[45dvh] shrink-0 space-y-3 overflow-y-auto pr-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <DialogHeader className="min-w-0 flex-1 basis-full text-left lg:basis-auto">
              <DialogTitle className="min-w-0 truncate">
                {title ?? file.fileName}
              </DialogTitle>
              {title ? (
                <p className="truncate text-sm text-muted-foreground">
                  {file.fileName}
                </p>
              ) : null}
            </DialogHeader>
            {actions}
          </div>
          {headerContent}
        </header>
        <DocumentFilePreviewContent key={file.url} file={file} />
      </DialogContent>
    </Dialog>
  );
}

function DocumentFilePreviewContent({ file }: { file: PreviewFile }) {
  const t = useTranslations("Applications.documents.pdf");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const isPdf = file.contentType === "application/pdf";
  const isImage = file.contentType.startsWith("image/");
  const unavailable = failed || !file.url || (!isPdf && !isImage);
  return (
    <div className="relative min-h-0 flex-1">
      {!ready && !unavailable ? (
        <div
          role="status"
          className="absolute inset-0 z-10 flex items-center justify-center bg-background"
        >
          <Loader2 className="mr-2 size-5 animate-spin" />
          {t("loading")}
        </div>
      ) : null}
      {unavailable ? (
        <div className="space-y-3 p-6 text-center">
          <p role="alert">{t("loadError")}</p>
          {file.url ? (
            <Button variant="outline" asChild>
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                {t("openFile")}
              </a>
            </Button>
          ) : null}
        </div>
      ) : isPdf ? (
        <PdfViewer
          key={file.url}
          src={file.url!}
          name={file.fileName}
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
  );
}
