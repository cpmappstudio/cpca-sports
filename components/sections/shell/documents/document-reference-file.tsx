"use client";

import { useTranslations } from "next-intl";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DOCUMENT_ATTACHMENT_ACCEPT,
  getDocumentAttachmentError,
  type DocumentAttachment,
} from "@/lib/applications/document-attachments";
import { DocumentFileUpload } from "./document-file-upload";

export function DocumentReferenceFile({
  attachment,
  pendingFile,
  onSelect,
  onRemove,
  disabled = false,
}: {
  attachment?: DocumentAttachment;
  pendingFile?: File;
  onSelect: (file: File) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Applications.documents.attachment");
  const fileName = pendingFile?.name ?? attachment?.fileName;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <p className="text-sm font-medium">{t("title")}</p>
      {fileName ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <DocumentAttachmentName fileName={fileName} />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("remove")}
            disabled={disabled}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        </div>
      ) : null}
      <DocumentFileUpload
        label={t(fileName ? "replace" : "upload")}
        accept={DOCUMENT_ATTACHMENT_ACCEPT}
        disabled={disabled}
        onSelect={(file) => {
          const error = getDocumentAttachmentError(file);
          if (error) {
            toast.error(t(error));
            return;
          }
          onSelect(file);
        }}
      />
      <p className="text-xs text-muted-foreground">{t("formats")}</p>
    </div>
  );
}

export function DocumentAttachmentName({ fileName }: { fileName?: string }) {
  if (!fileName) return null;
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
      <FileText className="size-4 shrink-0" />
      <span className="min-w-0 break-words">{fileName}</span>
    </div>
  );
}
