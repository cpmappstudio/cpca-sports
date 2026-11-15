"use client";

import { ApplicationDocumentSubmission } from "./application-document-submission";
import {
  uploadDocumentFile,
  type DocumentAttachment,
} from "@/lib/applications/document-attachments";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useIsAdmin } from "@/hooks/use-is-admin";
import type { Id } from "@/convex/_generated/dataModel";
import type {
  ApplicationDocumentWithUser,
  DocumentConfig,
  DocumentType,
  DocumentVisibility,
} from "@/lib/applications/document-types";
import {
  AddDocumentTypeForm,
  DocumentTypeActions,
  DocumentTypeCard,
} from "@/components/sections/shell/documents/document-type-components";

interface ApplicationDocumentsProps {
  applicationId: Id<"applications">;
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
  onCreateCustomDocumentType: (args: {
    applicationId: Id<"applications">;
    name: string;
    description?: string;
    required: boolean;
    attachmentId?: Id<"documentAttachments">;
  }) => Promise<Id<"applicationDocumentConfig">>;
  onUploadAttachment: (file: File) => Promise<DocumentAttachment>;
  onUpdateRequirement: (args: {
    applicationId: Id<"applications">;
    documentTypeId: string;
    attachmentId?: Id<"documentAttachments"> | null;
    name: string;
    description?: string;
    required: boolean;
  }) => Promise<null>;
  onDeleteCustomDocumentType: (args: {
    configId: Id<"applicationDocumentConfig">;
  }) => Promise<null>;
}

export function ApplicationDocuments({
  applicationId,
  documents,
  documentConfigs,
  onUpload,
  onUpdateStatus,
  onUpdateVisibility,
  onGenerateUploadUrl,
  onRemove,
  onCreateCustomDocumentType,
  onDeleteCustomDocumentType,
  onUploadAttachment,
  onUpdateRequirement,
}: ApplicationDocumentsProps) {
  const { isAdmin } = useIsAdmin();
  const [isAddingDocument, setIsAddingDocument] = useState(false);

  const t = useTranslations("Applications.documents");
  const configsByType = new Map(
    documentConfigs.map((config) => [config.documentTypeId, config]),
  );
  const uploadsByType = new Map(
    documents.map((document) => [document.documentTypeId, document]),
  );
  const documentTypes = new Map<string, DocumentType & { createdAt: number }>();

  for (const config of documentConfigs) {
    const uploaded = uploadsByType.get(config.documentTypeId);
    const name = config.name || uploaded?.name;
    if (!name) continue;
    documentTypes.set(config.documentTypeId, {
      id: config.documentTypeId,
      name,
      description: config.description ?? uploaded?.description,
      createdAt: config._creationTime,
    });
  }
  for (const uploaded of documents) {
    if (documentTypes.has(uploaded.documentTypeId)) continue;
    documentTypes.set(uploaded.documentTypeId, {
      id: uploaded.documentTypeId,
      name: uploaded.name,
      description: uploaded.description,
      createdAt: uploaded._creationTime,
    });
  }
  const visibleDocuments = [...documentTypes.values()]
    .filter(
      (document) =>
        configsByType.get(document.id)?.visibility !== "hidden" || isAdmin,
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-4">
      <DocumentTypeActions
        isAddingDocument={isAddingDocument}
        setIsAddingDocument={setIsAddingDocument}
      />

      {isAddingDocument ? (
        <AddDocumentTypeForm
          onAddDocument={async ({
            name,
            description,
            required,
            pendingFile,
          }) => {
            const attachment = pendingFile
              ? await onUploadAttachment(pendingFile)
              : undefined;
            await onCreateCustomDocumentType({
              attachmentId: attachment?.id,
              applicationId,
              name,
              description,
              required,
            });
          }}
          onClose={() => setIsAddingDocument(false)}
        />
      ) : null}

      {visibleDocuments.length === 0 && !isAddingDocument ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : null}

      {visibleDocuments.map((document) => {
        const config = configsByType.get(document.id);
        return (
          <ApplicationDocumentCard
            key={document.id}
            applicationId={applicationId}
            document={document}
            uploadedDocument={uploadsByType.get(document.id) ?? null}
            visibility={config?.visibility ?? "optional"}
            isCustom={config?.isCustom === true}
            customConfigId={config?._id ?? null}
            attachment={config?.attachment}
            onUploadAttachment={onUploadAttachment}
            onUpdateRequirement={onUpdateRequirement}
            onUpload={onUpload}
            onUpdateStatus={onUpdateStatus}
            onUpdateVisibility={onUpdateVisibility}
            onGenerateUploadUrl={onGenerateUploadUrl}
            onRemove={onRemove}
            onDeleteCustomDocumentType={onDeleteCustomDocumentType}
          />
        );
      })}
    </div>
  );
}

interface ApplicationDocumentCardProps {
  applicationId: Id<"applications">;
  document: DocumentType;
  attachment?: DocumentAttachment;
  onUploadAttachment: ApplicationDocumentsProps["onUploadAttachment"];
  onUpdateRequirement: ApplicationDocumentsProps["onUpdateRequirement"];
  uploadedDocument: ApplicationDocumentWithUser | null;
  visibility: DocumentVisibility;
  isCustom: boolean;
  customConfigId: Id<"applicationDocumentConfig"> | null;
  onUpload: ApplicationDocumentsProps["onUpload"];
  onUpdateStatus: ApplicationDocumentsProps["onUpdateStatus"];
  onUpdateVisibility: ApplicationDocumentsProps["onUpdateVisibility"];
  onGenerateUploadUrl: ApplicationDocumentsProps["onGenerateUploadUrl"];
  onRemove: ApplicationDocumentsProps["onRemove"];
  onDeleteCustomDocumentType: ApplicationDocumentsProps["onDeleteCustomDocumentType"];
}

function ApplicationDocumentCard({
  applicationId,
  document,
  uploadedDocument,
  attachment,
  visibility,
  isCustom,
  customConfigId,
  onUpload,
  onUpdateStatus,
  onUpdateVisibility,
  onGenerateUploadUrl,
  onRemove,
  onDeleteCustomDocumentType,
  onUploadAttachment,
  onUpdateRequirement,
}: ApplicationDocumentCardProps) {
  const { isAdmin } = useIsAdmin();

  const handleFileChange = async (file: File) => {
    const storageId = await uploadDocumentFile(file, onGenerateUploadUrl);
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
    return storageId;
  };

  return (
    <DocumentTypeCard
      name={document.name}
      description={document.description}
      visibility={visibility}
      canEdit={isAdmin}
      attachment={isAdmin ? attachment : undefined}
      canDelete={isAdmin && isCustom && !!customConfigId}
      onSaveEdit={async ({
        name,
        description,
        required,
        pendingFile,
        attachmentRemoved,
      }) => {
        const uploaded = pendingFile
          ? await onUploadAttachment(pendingFile)
          : undefined;
        await onUpdateRequirement({
          applicationId,
          documentTypeId: document.id,
          name,
          description,
          required,
          attachmentId: uploaded?.id ?? (attachmentRemoved ? null : undefined),
        });
      }}
      onDelete={
        customConfigId
          ? async () => {
              await onDeleteCustomDocumentType({ configId: customConfigId });
            }
          : undefined
      }
      onVisibilityChange={async (nextVisibility) => {
        await onUpdateVisibility({
          applicationId,
          documentTypeId: document.id,
          visibility: nextVisibility,
        });
      }}
    >
      <ApplicationDocumentSubmission
        applicationId={applicationId}
        document={document}
        uploadedDocument={uploadedDocument}
        isAdmin={isAdmin}
        canEditPdf={
          attachment?.contentType === "application/pdf" &&
          visibility !== "hidden"
        }
        onFileSelect={handleFileChange}
        onUpdateStatus={onUpdateStatus}
        onRemove={onRemove}
      />
    </DocumentTypeCard>
  );
}
