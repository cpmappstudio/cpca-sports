"use client";

import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  Download,
  ExternalLink,
  Loader2,
  Printer,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DocumentViewerActions({
  primary,
  disabled = false,
  onDownload,
  downloadLabel,
  downloadDisabled = false,
  onPrint,
  printDisabled = false,
  openUrl,
  menuItems,
  onMenuCloseAutoFocus,
}: {
  primary?: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    disabled?: boolean;
    pending?: boolean;
  };
  disabled?: boolean;
  onDownload?: () => Promise<void>;
  downloadLabel?: string;
  downloadDisabled?: boolean;
  onPrint?: () => Promise<void>;
  printDisabled?: boolean;
  openUrl?: string;
  menuItems?: ReactNode;
  onMenuCloseAutoFocus?: (event: Event) => void;
}) {
  const t = useTranslations("Common.documentViewer");
  const [operation, setOperation] = useState<"download" | "print" | null>(null);
  const busy = useRef(false);
  const pending = operation !== null || !!primary?.pending;
  async function run(kind: "download" | "print") {
    const action = kind === "download" ? onDownload : onPrint;
    if (!action || disabled || busy.current || primary?.pending) return;
    busy.current = true;
    setOperation(kind);
    try {
      await action();
    } catch {
      toast.error(t(kind === "download" ? "downloadError" : "printError"));
    } finally {
      busy.current = false;
      setOperation(null);
    }
  }
  const hasMenu =
    !!(primary && onDownload) || !!onPrint || !!openUrl || !!menuItems;
  const Icon = primary?.icon ?? Download;
  return (
    <ButtonGroup aria-label={t("actions")} className="min-w-0 max-w-full">
      <Button
        type="button"
        className="min-h-11 min-w-0 shrink"
        disabled={
          disabled ||
          pending ||
          (primary ? primary.disabled : !onDownload || downloadDisabled)
        }
        onClick={primary ? primary.onClick : () => void run("download")}
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          <Icon aria-hidden="true" />
        )}
        <span className="truncate">
          {operation === "print"
            ? t("printing")
            : (primary?.label ?? downloadLabel ?? t("download"))}
        </span>
      </Button>
      {hasMenu ? (
        <>
          <ButtonGroupSeparator className="bg-primary-foreground/25" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                className="size-11"
                aria-label={t("actions")}
                disabled={disabled || pending}
              >
                <ChevronDown aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onCloseAutoFocus={onMenuCloseAutoFocus}
            >
              {primary && onDownload ? (
                <DropdownMenuItem
                  className="min-h-11"
                  disabled={downloadDisabled}
                  onSelect={() => void run("download")}
                >
                  <Download aria-hidden="true" />
                  {downloadLabel ?? t("download")}
                </DropdownMenuItem>
              ) : null}
              {onPrint ? (
                <DropdownMenuItem
                  className="min-h-11"
                  disabled={printDisabled}
                  onSelect={() => void run("print")}
                >
                  <Printer aria-hidden="true" />
                  {t("print")}
                </DropdownMenuItem>
              ) : null}
              {openUrl ? (
                <DropdownMenuItem className="min-h-11" asChild>
                  <a href={openUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden="true" />
                    {t("open")}
                  </a>
                </DropdownMenuItem>
              ) : null}
              {menuItems ? (
                <>
                  <DropdownMenuSeparator />
                  {menuItems}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : null}
    </ButtonGroup>
  );
}
