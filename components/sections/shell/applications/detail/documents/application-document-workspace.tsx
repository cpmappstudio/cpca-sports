"use client";

import { useRef, useState, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { DocumentViewerActions } from "@/components/documents/document-viewer-actions";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DocumentFilePreviewDialog } from "@/components/documents/document-file-preview";
import { DocumentFileUpload } from "@/components/sections/shell/documents/document-file-upload";
import { ApplicationDocumentEditor } from "./application-document-editor";
import { ApplicationDocumentReview } from "./application-document-review";
import type { ApplicationDocumentSubmission } from "./application-document-submission";
import type { ApplicationDocumentWithUser } from "@/lib/applications/document-types";

type SubmissionProps = ComponentProps<typeof ApplicationDocumentSubmission>;

export function ApplicationDocumentWorkspace({
  applicationId,
  document,
  uploadedDocument,
  isAdmin,
  canEditPdf,
  onFileSelect,
  onUpdateStatus,
  onRemove,
  startEditing,
  onClose,
}: SubmissionProps & { startEditing: boolean; onClose: () => void }) {
  const t = useTranslations("Applications.documents");
  const [editing, setEditing] = useState<{ storageId: string | null } | null>(
    startEditing ? { storageId: uploadedDocument?.storageId ?? null } : null,
  );
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [pendingFile, setPendingFile] = useState<{
    previous: string | null;
    saved: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ApplicationDocumentWithUser | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(false);
  const currentStorageId = uploadedDocument?.storageId ?? null;
  const waiting =
    !!pendingFile &&
    currentStorageId === pendingFile.previous &&
    currentStorageId !== pendingFile.saved;
  const disabled = busy || waiting || !!deleteTarget;

  function changeBusy(next: boolean) {
    busyRef.current = next;
    setBusy(next);
  }

  if (pendingFile && !waiting) setPendingFile(null);

  async function replace(file: File) {
    if (busyRef.current) return;
    changeBusy(true);
    try {
      const saved = await onFileSelect(file);
      setPendingFile({ previous: currentStorageId, saved });
    } finally {
      changeBusy(false);
    }
  }

  async function remove() {
    if (!deleteTarget || busyRef.current) return;
    changeBusy(true);
    setRemoving(true);
    setRemoveError(false);
    try {
      await onRemove({ documentId: deleteTarget._id });
      onClose();
    } catch {
      setRemoveError(true);
    } finally {
      setRemoving(false);
      changeBusy(false);
    }
  }

  if (editing)
    return (
      <ApplicationDocumentEditor
        applicationId={applicationId}
        documentTypeId={document.id}
        isAdmin={isAdmin}
        onSaved={(storageId) => {
          setPendingFile({ previous: editing.storageId, saved: storageId });
          setEditing(null);
        }}
        onClose={() => {
          if (uploadedDocument) setEditing(null);
          else onClose();
        }}
      />
    );

  if (waiting || !uploadedDocument)
    return (
      <Dialog
        open
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
      >
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{document.name}</DialogTitle>
          </DialogHeader>
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            {waiting ? <Loader2 className="size-4 animate-spin" /> : null}
            {t(waiting ? "submission.updating" : "pdf.unavailable")}
          </p>
        </DialogContent>
      </Dialog>
    );

  return (
    <>
      <DocumentFilePreviewDialog
        file={uploadedDocument}
        title={document.name}
        onOpenChange={(next) => {
          if (!next && !busyRef.current && !deleteTarget) onClose();
        }}
        closeDisabled={disabled}
        renderActions={(viewerActions) => (
          <DocumentFileUpload
            id={`replace-${document.id}`}
            label={t("actions.replace")}
            disabled={disabled}
            onSelect={replace}
            renderTrigger={({ onClick, disabled: uploading, label }) => (
              <DocumentViewerActions
                {...viewerActions}
                disabled={disabled}
                primary={
                  canEditPdf
                    ? {
                        label: t("submission.editDocument"),
                        icon: Pencil,
                        onClick: () =>
                          setEditing({ storageId: uploadedDocument.storageId }),
                      }
                    : undefined
                }
                onMenuCloseAutoFocus={(event) => {
                  if (deleteTarget) event.preventDefault();
                }}
                menuItems={
                  <>
                    <DropdownMenuItem
                      className="min-h-11"
                      onSelect={onClick}
                      disabled={uploading}
                    >
                      <Upload aria-hidden="true" />
                      {label}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="min-h-11"
                      variant="destructive"
                      disabled={disabled}
                      onSelect={() => {
                        setRemoveError(false);
                        setDeleteTarget(uploadedDocument);
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                      {t("actions.delete")}
                    </DropdownMenuItem>
                  </>
                }
              />
            )}
          />
        )}
        headerContent={
          <ApplicationDocumentReview
            key={`${uploadedDocument._id}:${uploadedDocument.status}`}
            document={uploadedDocument}
            canReview={isAdmin}
            disabled={disabled}
            onBusyChange={changeBusy}
            onComplete={onClose}
            onUpdateStatus={onUpdateStatus}
          />
        }
      />
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(next) => {
          if (!next && !removing) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("actions.deleteDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("actions.deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {removeError ? (
            <p role="alert" className="text-sm text-destructive">
              {t("submission.deleteError")}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>
              {t("actions.deleteDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removing}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {removing ? <Loader2 className="animate-spin" /> : null}
              {t(
                removing
                  ? "submission.deleting"
                  : "actions.deleteDialog.confirm",
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
