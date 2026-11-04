"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentReferenceFile } from "./document-reference-file";
import type { EditDocumentTypeInput } from "./document-type-shared";

export function DocumentRequirementFields({
  value,
  onChange,
  disabled,
}: {
  value: EditDocumentTypeInput;
  onChange: (value: EditDocumentTypeInput) => void;
  disabled: boolean;
}) {
  const id = useId();
  const t = useTranslations("Applications.documents");

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${id}-name`}>{t("form.documentName")}</Label>
        <Input
          id={`${id}-name`}
          placeholder={t("form.documentNamePlaceholder")}
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-description`}>{t("form.description")}</Label>
        <Input
          id={`${id}-description`}
          placeholder={t("form.descriptionPlaceholder")}
          value={value.description ?? ""}
          onChange={(event) =>
            onChange({ ...value, description: event.target.value })
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`${id}-required`}
          checked={value.required}
          className="h-4 w-4 rounded border-gray-300"
          onChange={(event) =>
            onChange({ ...value, required: event.target.checked })
          }
        />
        <Label htmlFor={`${id}-required`} className="cursor-pointer">
          {t("form.required")}
        </Label>
      </div>
      <DocumentReferenceFile
        attachment={value.attachment}
        pendingFile={value.pendingFile}
        disabled={disabled}
        onSelect={(pendingFile) =>
          onChange({ ...value, pendingFile, attachmentRemoved: false })
        }
        onRemove={() =>
          onChange({
            ...value,
            attachment: undefined,
            pendingFile: undefined,
            attachmentRemoved: true,
          })
        }
      />
    </fieldset>
  );
}
