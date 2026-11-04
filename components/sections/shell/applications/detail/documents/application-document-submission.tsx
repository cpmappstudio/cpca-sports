"use client";

import { useState, type ComponentProps } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationDocumentStatus } from "./application-document-status";
import { DocumentFilePreview } from "@/components/documents/document-file-preview";
import { DocumentFileUpload } from "@/components/sections/shell/documents/document-file-upload";
import type {
  ApplicationDocumentWithUser,
  DocumentType,
} from "@/lib/applications/document-types";
import { ApplicationDocumentWorkspace } from "./application-document-workspace";
import type { ApplicationDocuments } from "./application-documents";

type DocumentCallbacks = ComponentProps<typeof ApplicationDocuments>;

export function ApplicationDocumentSubmission({
  applicationId,
  document,
  uploadedDocument,
  isAdmin,
  canEditPdf,
  onFileSelect,
  onUpdateStatus,
  onRemove,
}: {
  applicationId: DocumentCallbacks["applicationId"];
  document: DocumentType;
  uploadedDocument: ApplicationDocumentWithUser | null;
  isAdmin: boolean;
  canEditPdf: boolean;
  onFileSelect: (file: File) => Promise<string>;
  onUpdateStatus: DocumentCallbacks["onUpdateStatus"];
  onRemove: DocumentCallbacks["onRemove"];
}) {
  const t = useTranslations("Applications.documents");
  const format = useFormatter();
  const [workspace, setWorkspace] = useState<"preview" | "edit" | null>(null);
  const status = uploadedDocument?.status ?? "notUploaded";
  const correction = !isAdmin && status === "rejected";

  return (
    <>
      <section
        aria-label={t(isAdmin ? "submission.title" : "submission.myTitle")}
        className="min-w-0 space-y-3 rounded-xl border bg-muted/30 p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-medium">
            {t(isAdmin ? "submission.title" : "submission.myTitle")}
          </h4>
          <ApplicationDocumentStatus status={status} />
        </div>
        {uploadedDocument ? (
          <>
            <div className="min-w-0 space-y-1 py-1">
              <DocumentFilePreview
                file={uploadedDocument}
                onOpen={() => setWorkspace("preview")}
                ariaLabel={t("submission.viewFile", {
                  name: uploadedDocument.fileName,
                })}
              />
              <p className="pl-6 text-xs text-muted-foreground">
                {t("uploadedBy", {
                  date: format.dateTime(uploadedDocument.uploadedAt, {
                    dateStyle: "medium",
                  }),
                  name: uploadedDocument.uploadedByUser
                    ? `${uploadedDocument.uploadedByUser.firstName} ${uploadedDocument.uploadedByUser.lastName}`
                    : t("submission.unknownAuthor"),
                })}
              </p>
            </div>
            {status === "rejected" && uploadedDocument.rejectionReason ? (
              <div className="space-y-1 rounded-md bg-destructive/5 p-3 text-sm">
                <p className="font-medium">{t("rejectionReason")}</p>
                <p className="whitespace-pre-wrap break-words">
                  {uploadedDocument.rejectionReason}
                </p>
              </div>
            ) : null}
            {correction ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setWorkspace(canEditPdf ? "edit" : "preview")}
              >
                <Pencil />
                {t("submission.correct")}
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t(isAdmin ? "submission.empty" : "submission.emptyMine")}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {canEditPdf ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setWorkspace("edit")}
                >
                  <Pencil />
                  {t("pdf.complete")}
                </Button>
              ) : null}
              <DocumentFileUpload
                id={`file-${document.id}`}
                label={t("actions.upload")}
                variant={canEditPdf ? "outline" : "default"}
                onSelect={async (file) => {
                  await onFileSelect(file);
                }}
              />
            </div>
          </>
        )}
      </section>
      {workspace ? (
        <ApplicationDocumentWorkspace
          applicationId={applicationId}
          document={document}
          uploadedDocument={uploadedDocument}
          isAdmin={isAdmin}
          canEditPdf={canEditPdf}
          onFileSelect={onFileSelect}
          onUpdateStatus={onUpdateStatus}
          onRemove={onRemove}
          startEditing={workspace === "edit"}
          onClose={() => setWorkspace(null)}
        />
      ) : null}
    </>
  );
}
