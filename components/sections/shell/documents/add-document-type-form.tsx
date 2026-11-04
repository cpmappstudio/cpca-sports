"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentRequirementFields } from "./document-requirement-fields";
import {
  type ErrorHandler,
  type EditDocumentTypeInput,
  handleDocumentTypeError,
} from "./document-type-shared";

interface AddDocumentTypeFormProps {
  onAddDocument: (document: EditDocumentTypeInput) => Promise<void>;
  onClose: () => void;
  onError?: ErrorHandler;
}

export function AddDocumentTypeForm({
  onAddDocument,
  onClose,
  onError,
}: AddDocumentTypeFormProps) {
  const t = useTranslations("Applications.documents");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDocument, setNewDocument] = useState<EditDocumentTypeInput>({
    name: "",
    description: "",
    required: false,
  });

  const handleAdd = async () => {
    const trimmedName = newDocument.name.trim();
    if (!trimmedName) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddDocument({
        ...newDocument,
        name: trimmedName,
        description: newDocument.description?.trim() || undefined,
        required: newDocument.required,
      });
      setNewDocument({ name: "", description: "", required: false });
      onClose();
    } catch (error) {
      handleDocumentTypeError(
        error,
        onError ?? (() => toast.error(t("form.saveError"))),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <DocumentRequirementFields
          value={newDocument}
          onChange={setNewDocument}
          disabled={isSubmitting}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
          >
            {t("actions.cancel")}
          </Button>
          <Button
            onClick={handleAdd}
            className="flex-1"
            disabled={isSubmitting || !newDocument.name.trim()}
          >
            {isSubmitting ? t("form.adding") : t("form.addButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
