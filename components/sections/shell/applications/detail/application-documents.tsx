"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  FileIcon,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
} from "lucide-react";
import {
  APPLICATION_DOCUMENTS,
  type DocumentType,
  type DocumentVisibility,
  type ApplicationDocumentWithUser,
  type DocumentConfig,
} from "@/lib/applications/document-types";
import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";

interface ApplicationDocumentsProps {
  applicationId: Id<"applications">;
  isAdmin: boolean;
  documents: ApplicationDocumentWithUser[];
  documentConfigs: DocumentConfig[];
  onUpload: (args: {
    applicationId: Id<"applications">;
    documentTypeId: string;
    name: string;
    description?: string;
    storageId: Id<"_storage">;
    fileName: string;
    contentType: string;
    fileSize: number;
  }) => Promise<Id<"applicationDocuments">>;
  onUpdateStatus: (args: {
    documentId: Id<"applicationDocuments">;
    status: "approved" | "rejected";
    rejectionReason?: string;
  }) => Promise<null>;
  onUpdateVisibility: (args: {
    applicationId: Id<"applications">;
    documentTypeId: string;
    visibility: DocumentVisibility;
  }) => Promise<Id<"applicationDocumentConfig">>;
  onGenerateUploadUrl: () => Promise<string>;
  onRemove: (args: { documentId: Id<"applicationDocuments"> }) => Promise<null>;
}

export function ApplicationDocuments({
  applicationId,
  isAdmin,
  documents,
  documentConfigs,
  onUpload,
  onUpdateStatus,
  onUpdateVisibility,
  onGenerateUploadUrl,
  onRemove,
}: ApplicationDocumentsProps) {
  const t = useTranslations("Applications.documents");

  const getDocumentVisibility = (
    documentType: DocumentType,
  ): DocumentVisibility => {
    const config = documentConfigs.find(
      (c) => c.documentTypeId === documentType.id,
    );
    if (config) {
      return config.visibility;
    }
    return documentType.required ? "required" : "optional";
  };

  const getUploadedDocument = (
    documentTypeId: string,
  ): ApplicationDocumentWithUser | null => {
    return (
      documents.find((doc) => doc.documentTypeId === documentTypeId) || null
    );
  };

  const visibleDocuments = APPLICATION_DOCUMENTS.filter((doc) => {
    const visibility = getDocumentVisibility(doc);
    if (visibility === "hidden" && !isAdmin) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {visibleDocuments.map((document) => (
        <DocumentCard
          key={document.id}
          applicationId={applicationId}
          document={document}
          uploadedDocument={getUploadedDocument(document.id)}
          visibility={getDocumentVisibility(document)}
          isAdmin={isAdmin}
          onUpload={onUpload}
          onUpdateStatus={onUpdateStatus}
          onUpdateVisibility={onUpdateVisibility}
          onGenerateUploadUrl={onGenerateUploadUrl}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

interface DocumentCardProps {
  applicationId: Id<"applications">;
  document: DocumentType;
  uploadedDocument: ApplicationDocumentWithUser | null;
  visibility: DocumentVisibility;
  isAdmin: boolean;
  onUpload: ApplicationDocumentsProps["onUpload"];
  onUpdateStatus: ApplicationDocumentsProps["onUpdateStatus"];
  onUpdateVisibility: ApplicationDocumentsProps["onUpdateVisibility"];
  onGenerateUploadUrl: ApplicationDocumentsProps["onGenerateUploadUrl"];
  onRemove: ApplicationDocumentsProps["onRemove"];
}

function DocumentCard({
  applicationId,
  document,
  uploadedDocument,
  visibility,
  isAdmin,
  onUpload,
  onUpdateStatus,
  onUpdateVisibility,
  onGenerateUploadUrl,
  onRemove,
}: DocumentCardProps) {
  const t = useTranslations("Applications.documents");
  const [isUploading, setIsUploading] = useState(false);
  const [visibilityPopoverOpen, setVisibilityPopoverOpen] = useState(false);

  const canDelete = !!uploadedDocument;

  const handleRemove = async () => {
    if (!uploadedDocument) return;
    try {
      await onRemove({ documentId: uploadedDocument._id });
    } catch (error) {
      console.error("Failed to remove document:", error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadUrl = await onGenerateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();

      await onUpload({
        applicationId,
        documentTypeId: document.id,
        name: document.name,
        description: document.description,
        storageId,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
    } catch (error) {
      console.error("Failed to upload document:", error);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleVisibilityChange = async (newVisibility: DocumentVisibility) => {
    try {
      await onUpdateVisibility({
        applicationId,
        documentTypeId: document.id,
        visibility: newVisibility,
      });
      setVisibilityPopoverOpen(false);
    } catch (error) {
      console.error("Failed to update visibility:", error);
    }
  };

  const getVisibilityBadge = () => {
    const variants: Record<
      DocumentVisibility,
      { variant: "secondary" | "outline"; className?: string }
    > = {
      required: { variant: "secondary" },
      optional: { variant: "outline" },
      hidden: {
        variant: "outline",
        className: "bg-muted text-muted-foreground",
      },
    };

    const config = variants[visibility];

    if (isAdmin) {
      return (
        <Popover
          open={visibilityPopoverOpen}
          onOpenChange={setVisibilityPopoverOpen}
        >
          <PopoverTrigger asChild>
            <Badge
              variant={config.variant}
              className={cn(
                "text-xs cursor-pointer hover:bg-accent",
                config.className,
              )}
            >
              {t(`visibility.${visibility}`)}
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2" align="end">
            <div className="flex flex-col gap-1">
              <Button
                variant={visibility === "required" ? "secondary" : "ghost"}
                size="sm"
                className="justify-start"
                onClick={() => handleVisibilityChange("required")}
              >
                {t("visibility.required")}
              </Button>
              <Button
                variant={visibility === "optional" ? "secondary" : "ghost"}
                size="sm"
                className="justify-start"
                onClick={() => handleVisibilityChange("optional")}
              >
                {t("visibility.optional")}
              </Button>
              <Button
                variant={visibility === "hidden" ? "secondary" : "ghost"}
                size="sm"
                className="justify-start"
                onClick={() => handleVisibilityChange("hidden")}
              >
                {t("visibility.hidden")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <Badge
        variant={config.variant}
        className={cn("text-xs", config.className)}
      >
        {t(`visibility.${visibility}`)}
      </Badge>
    );
  };

  const getStatusBadge = () => {
    if (!uploadedDocument) {
      return (
        <Badge variant="outline" className="gap-1">
          <XCircle className="h-3 w-3" />
          {t("status.notUploaded")}
        </Badge>
      );
    }

    switch (uploadedDocument.status) {
      case "approved":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
          >
            <CheckCircle2 className="h-3 w-3" />
            {t("status.approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t("status.rejected")}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            {t("status.pending")}
          </Badge>
        );
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Card
      className={cn(
        "transition-colors",
        uploadedDocument?.status === "rejected" && "border-destructive",
        visibility === "hidden" && "bg-muted/50",
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{document.name}</CardTitle>
              {getVisibilityBadge()}
            </div>
            {document.description && (
              <CardDescription className="mt-1 text-sm">
                {document.description}
              </CardDescription>
            )}
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {uploadedDocument && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-3">
              <FileIcon className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {uploadedDocument.fileName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("uploadedBy", {
                    date: formatDate(uploadedDocument.uploadedAt),
                    name: uploadedDocument.uploadedByUser
                      ? `${uploadedDocument.uploadedByUser.firstName} ${uploadedDocument.uploadedByUser.lastName}`
                      : "Unknown",
                  })}
                </span>
              </div>
            </div>
            {uploadedDocument.url && (
              <Button size="sm" variant="ghost" className="gap-1" asChild>
                <a
                  href={uploadedDocument.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Eye className="h-4 w-4" />
                  {t("actions.view")}
                </a>
              </Button>
            )}
          </div>
        )}

        {uploadedDocument?.status === "rejected" &&
          uploadedDocument.rejectionReason && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                <strong>{t("rejectionReason")}:</strong>{" "}
                {uploadedDocument.rejectionReason}
              </p>
            </div>
          )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="file"
              id={`file-${document.id}`}
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full cursor-pointer"
              disabled={isUploading}
            >
              <label htmlFor={`file-${document.id}`} className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {isUploading
                  ? "Uploading..."
                  : uploadedDocument
                    ? t("actions.replace")
                    : t("actions.upload")}
              </label>
            </Button>
          </div>

          {isAdmin && uploadedDocument && (
            <>
              {uploadedDocument.status !== "approved" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-green-500 hover:bg-green-600 text-white"
                      onClick={() =>
                        onUpdateStatus({
                          documentId: uploadedDocument._id,
                          status: "approved",
                        })
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("actions.approve")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {uploadedDocument.status !== "rejected" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        onUpdateStatus({
                          documentId: uploadedDocument._id,
                          status: "rejected",
                          rejectionReason:
                            "Document quality is not sufficient. Please upload a clearer version.",
                        })
                      }
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("actions.reject")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          )}

          {canDelete && (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("actions.delete")}</p>
                </TooltipContent>
              </Tooltip>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                    <Trash2 />
                  </AlertDialogMedia>
                  <AlertDialogTitle>
                    {t("actions.deleteDialog.title")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("actions.deleteDialog.description")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel variant="outline">
                    {t("actions.deleteDialog.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={handleRemove}
                  >
                    {t("actions.deleteDialog.confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
