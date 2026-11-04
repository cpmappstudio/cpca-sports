"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Save } from "lucide-react";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DocumentDefaultsManager } from "@/components/sections/shell/documents/document-defaults-manager";
import type { EditableDocumentConfig } from "@/components/sections/shell/documents/document-default-types";

interface ProgramDocumentsProps {
  documents: EditableDocumentConfig[] | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onChange: (documents: EditableDocumentConfig[]) => void;
}

export function ProgramDocuments({
  documents,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onChange,
}: ProgramDocumentsProps) {
  const tPrograms = useTranslations("Programs.create");

  return (
    <div className="space-y-4">
      {hasUnsavedChanges ? (
        <Alert
          role="status"
          variant="warning"
          appearance="light"
          className="items-start"
        >
          <AlertIcon aria-hidden="true">
            <Save />
          </AlertIcon>
          <AlertContent className="min-w-0 flex-1 space-y-3 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:space-y-0">
            <div className="space-y-1">
              <AlertTitle>{tPrograms("documents.unsavedChanges")}</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                {tPrograms("documents.saveReminder")}
              </AlertDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full shrink-0 sm:w-auto"
              onClick={onSave}
              disabled={isSaving}
            >
              {tPrograms("header.saveAction")}
            </Button>
          </AlertContent>
        </Alert>
      ) : null}
      <DocumentDefaultsManager
        documents={documents}
        disabled={isSaving}
        loadingText={tPrograms("documents.loading")}
        emptyTitle={tPrograms("documents.emptyStateTitle")}
        emptyDescription={tPrograms("documents.emptyStateDescription")}
        activeHint={tPrograms("documents.activeHint")}
        hiddenHint={tPrograms("documents.hiddenHint")}
        onChange={onChange}
        onDocumentAdded={() =>
          toast.success(tPrograms("documents.added"), {
            description: tPrograms("documents.saveReminder"),
          })
        }
      />
    </div>
  );
}
