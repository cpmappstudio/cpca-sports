"use client";

import { useTranslations } from "next-intl";
import { DocumentDefaultsManager } from "@/components/sections/shell/documents/document-defaults-manager";
import type { EditableDocumentConfig } from "@/components/sections/shell/documents/document-default-types";

interface TemplateDocumentsProps {
  documents: EditableDocumentConfig[] | null;
  onChange: (documents: EditableDocumentConfig[]) => void;
  isSaving: boolean;
}

export function TemplateDocuments({
  documents,
  onChange,
  isSaving,
}: TemplateDocumentsProps) {
  const t = useTranslations("Forms.template");

  return (
    <DocumentDefaultsManager
      documents={documents}
      disabled={isSaving}
      loadingText={t("documents.loading")}
      emptyTitle={t("documents.emptyStateTitle")}
      emptyDescription={t("documents.emptyStateDescription")}
      activeHint={t("documents.activeHint")}
      hiddenHint={t("documents.hiddenHint")}
      onChange={onChange}
    />
  );
}
