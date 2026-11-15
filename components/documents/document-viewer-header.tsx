"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { FileText, X } from "lucide-react";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DocumentViewerHeader({
  title,
  description,
  actions,
  children,
  onClose,
  closeDisabled = false,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
}) {
  const t = useTranslations("Common.documentViewer");
  return (
    <header className="max-h-[45dvh] shrink-0 overflow-y-auto border-b bg-background px-4 py-3 sm:px-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="flex min-w-0 items-start gap-3">
          <FileText
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-primary"
          />
          <div className="min-w-0 space-y-1">
            <DialogTitle className="break-words text-base leading-snug [overflow-wrap:anywhere]">
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription asChild>
                <div className="break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {description}
                </div>
              </DialogDescription>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-end gap-2 lg:col-span-1 lg:col-start-2 lg:row-start-1">
            {actions}
          </div>
        ) : null}
        <div className="col-start-2 row-start-1 lg:col-start-3 lg:border-l lg:pl-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={t("close")}
            disabled={closeDisabled}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </header>
  );
}
