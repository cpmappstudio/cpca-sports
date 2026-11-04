"use client";

import type { EditDocumentTypeInput } from "./document-type-shared";
import { useState } from "react";
import {
  AddDocumentTypeForm,
  DocumentTypeActions,
  DocumentTypeCard,
} from "@/components/sections/shell/documents/document-type-components";
import {
  createEditableDocumentTypeId,
  type EditableDocumentConfig,
} from "./document-default-types";

interface DocumentDefaultsManagerProps {
  documents: EditableDocumentConfig[] | null;
  loadingText: string;
  emptyTitle: string;
  emptyDescription: string;
  activeHint: string;
  hiddenHint: string;
  onChange: (documents: EditableDocumentConfig[]) => void;
  onDocumentAdded?: () => void;
  disabled?: boolean;
}

export function DocumentDefaultsManager({
  documents,
  loadingText,
  emptyTitle,
  emptyDescription,
  activeHint,
  hiddenHint,
  onChange,
  onDocumentAdded,
  disabled = false,
}: DocumentDefaultsManagerProps) {
  const [isAddingDocument, setIsAddingDocument] = useState(false);

  const handleAddDocument = async (document: EditDocumentTypeInput) => {
    const nextDocuments = [
      ...(documents ?? []),
      {
        documentTypeId: createEditableDocumentTypeId(document.name),
        name: document.name,
        description: document.description,
        pendingFile: document.pendingFile,
        visibility: document.required
          ? ("required" as const)
          : ("optional" as const),
      },
    ];

    onChange(nextDocuments);
    onDocumentAdded?.();
  };

  if (documents === null) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-5">
        <p className="text-sm text-muted-foreground">{loadingText}</p>
      </div>
    );
  }

  return (
    <fieldset
      disabled={disabled}
      className="min-w-0 space-y-4"
      aria-busy={disabled}
    >
      <DocumentTypeActions
        isAddingDocument={isAddingDocument}
        setIsAddingDocument={setIsAddingDocument}
      />

      {isAddingDocument ? (
        <AddDocumentTypeForm
          onAddDocument={handleAddDocument}
          onClose={() => setIsAddingDocument(false)}
        />
      ) : null}

      {documents.length === 0 && !isAddingDocument ? (
        <div className="rounded-lg border border-dashed px-4 py-5">
          <h3 className="text-sm font-medium">{emptyTitle}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {emptyDescription}
          </p>
        </div>
      ) : null}

      {[...documents].reverse().map((document) => (
        <DocumentTypeCard
          key={document.documentTypeId}
          name={document.name}
          description={document.description}
          visibility={document.visibility}
          canEdit
          canDelete
          attachment={document.attachment}
          pendingFile={document.pendingFile}
          onSaveEdit={async ({
            name,
            description,
            required,
            pendingFile,
            attachmentRemoved,
          }) => {
            onChange(
              documents.map((current) =>
                current.documentTypeId !== document.documentTypeId
                  ? current
                  : {
                      ...current,
                      name,
                      description,
                      pendingFile,
                      ...(attachmentRemoved
                        ? { attachmentId: undefined, attachment: undefined }
                        : {}),
                      visibility: required
                        ? "required"
                        : current.visibility === "hidden"
                          ? "hidden"
                          : "optional",
                    },
              ),
            );
          }}
          onDelete={async () => {
            onChange(
              documents.filter(
                (current) => current.documentTypeId !== document.documentTypeId,
              ),
            );
          }}
          onVisibilityChange={async (visibility) => {
            onChange(
              documents.map((current) =>
                current.documentTypeId !== document.documentTypeId
                  ? current
                  : {
                      ...current,
                      visibility,
                    },
              ),
            );
          }}
        >
          <p className="text-sm text-muted-foreground">
            {document.visibility === "hidden" ? hiddenHint : activeHint}
          </p>
        </DocumentTypeCard>
      ))}
    </fieldset>
  );
}
