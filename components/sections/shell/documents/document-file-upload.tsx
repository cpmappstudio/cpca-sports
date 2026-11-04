"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DocumentFileUpload({
  label,
  id: providedId,
  onSelect,
  disabled = false,
  accept = ".pdf,.jpg,.jpeg,.png",
  variant,
  renderTrigger,
}: {
  label: string;
  id?: string;
  onSelect: (file: File) => void | Promise<void>;
  disabled?: boolean;
  accept?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  renderTrigger?: (props: {
    onClick: () => void;
    disabled: boolean;
    label: string;
  }) => ReactNode;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const [isUploading, setIsUploading] = useState(false);
  const t = useTranslations("Applications.documents.file");

  const trigger = {
    onClick: () => document.getElementById(id)?.click(),
    disabled: disabled || isUploading,
    label: isUploading ? t("uploading") : label,
  };
  return (
    <div className={renderTrigger ? "relative" : "relative flex-1"}>
      <input
        id={id}
        type="file"
        className="hidden"
        accept={accept}
        disabled={disabled || isUploading}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setIsUploading(true);
          try {
            await onSelect(file);
          } catch {
            toast.error(t("uploadFailed"));
          } finally {
            setIsUploading(false);
          }
        }}
      />
      {renderTrigger ? (
        renderTrigger(trigger)
      ) : (
        <Button
          type="button"
          size="sm"
          variant={variant}
          className="w-full"
          aria-controls={id}
          disabled={trigger.disabled}
          onClick={trigger.onClick}
        >
          <Upload />
          {trigger.label}
        </Button>
      )}
    </div>
  );
}
