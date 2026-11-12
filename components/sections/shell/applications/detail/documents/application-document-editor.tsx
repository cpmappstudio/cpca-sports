"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useApplicationDocumentPdf } from "@/hooks/use-application-document-pdf";
import { Button } from "@/components/ui/button";
import { DocumentViewerHeader } from "@/components/documents/document-viewer-header";
import { DocumentViewerActions } from "@/components/documents/document-viewer-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PdfViewer = dynamic(() => import("@/components/documents/pdf-viewer"), {
  ssr: false,
});
type PdfDocument = NonNullable<FunctionReturnType<typeof api.documentPdf.get>>;
type EditorProps = {
  applicationId: Id<"applications">;
  documentTypeId: string;
  onClose: () => void;
  onSaved: (storageId: string) => void;
  isAdmin: boolean;
};

export function ApplicationDocumentEditor({
  applicationId,
  documentTypeId,
  onClose,
  onSaved,
  isAdmin,
}: EditorProps) {
  const latest = useQuery(api.documentPdf.get, {
    applicationId,
    documentTypeId,
  });
  const t = useTranslations("Applications.documents.pdf");
  const [initial, setInitial] = useState<PdfDocument | null>(null);
  if (!initial && latest) {
    setInitial(latest);
    return null;
  }
  if (!initial)
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t(latest === undefined ? "loading" : "unavailable")}
            </DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  return (
    <Editor
      applicationId={applicationId}
      documentTypeId={documentTypeId}
      initial={initial}
      latest={latest ?? null}
      onClose={onClose}
      onSaved={onSaved}
      isAdmin={isAdmin}
    />
  );
}

function Editor({
  applicationId,
  documentTypeId,
  initial,
  latest,
  onClose,
  onSaved,
  isAdmin,
}: EditorProps & {
  initial: PdfDocument;
  latest: PdfDocument | null;
}) {
  const t = useTranslations("Applications.documents.pdf");
  const editor = useApplicationDocumentPdf({
    applicationId,
    documentTypeId,
    initial,
    latest,
    onSaved: (storageId) => {
      toast.success(t(isAdmin ? "changesSaved" : "saved"));
      onSaved(storageId);
    },
  });
  const [started, setStarted] = useState(!initial.needsRestart);
  const [loadError, setLoadError] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const close = () => {
    if (editor.saving) return;
    if (editor.unsaved) setConfirmClose(true);
    else onClose();
  };
  const blocked = editor.saving || editor.pending || editor.conflict;
  return (
    <Dialog open onOpenChange={close}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="flex h-[95dvh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]"
        onEscapeKeyDown={(event) => {
          if (confirmClose) event.preventDefault();
        }}
      >
        <DocumentViewerHeader
          title={editor.document.name}
          description={t(
            editor.unsaved
              ? "unsaved"
              : isAdmin
                ? "editInstructions"
                : "instructions",
          )}
          onClose={close}
          closeDisabled={editor.saving}
          actions={
            <DocumentViewerActions
              primary={{
                label: t(
                  editor.saving
                    ? "saving"
                    : editor.pending
                      ? "retry"
                      : isAdmin
                        ? "saveChanges"
                        : "submit",
                ),
                icon: Save,
                disabled:
                  !editor.ready ||
                  editor.conflict ||
                  loadError ||
                  (!editor.dirty && !editor.pending),
                pending: editor.saving,
                onClick: () => void editor.save(),
              }}
              onDownload={editor.download}
              downloadLabel={t("download")}
              downloadDisabled={!editor.ready || loadError}
              onPrint={() => editor.viewer.current!.printPdf()}
              printDisabled={!editor.ready || loadError}
            />
          }
        />
        {editor.conflict ? (
          <p
            role="alert"
            className="m-3 rounded-md border border-destructive p-3 text-sm"
          >
            {t("conflict")}
          </p>
        ) : null}
        {editor.error ? (
          <p
            role="alert"
            className="m-3 rounded-md border border-destructive p-3 text-sm"
          >
            {t(editor.error)}
          </p>
        ) : null}
        {!started ? (
          <div className="m-auto max-w-lg space-y-4 text-center">
            <p>{t("restartWarning")}</p>
            <Button type="button" onClick={() => setStarted(true)}>
              {t("restart")}
            </Button>
          </div>
        ) : (
          <div className="relative min-h-0 flex-1">
            {!editor.ready && !loadError ? (
              <div
                role="status"
                className="absolute inset-0 z-10 flex items-center justify-center bg-background"
              >
                <Loader2 className="mr-2 size-5 animate-spin" />
                {t("loading")}
              </div>
            ) : null}
            {loadError ? (
              <div className="space-y-3 p-6 text-center">
                <p role="alert">{t("loadError")}</p>
                <Button variant="outline" asChild>
                  <a
                    href={editor.document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("openFile")}
                  </a>
                </Button>
              </div>
            ) : (
              <div className="size-full" inert={blocked || undefined}>
                <PdfViewer
                  src={editor.document.url}
                  name={editor.document.fileName}
                  author={editor.document.author}
                  readOnly={false}
                  viewerRef={editor.viewer}
                  onReady={editor.onReady}
                  onChange={editor.onChange}
                  onError={() => setLoadError(true)}
                />
              </div>
            )}
          </div>
        )}
        <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("discardTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("discardDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("keepEditing")}</AlertDialogCancel>
              <AlertDialogAction onClick={onClose}>
                {t("discard")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
