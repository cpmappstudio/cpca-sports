"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, CircleDashed, Clock3, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ApplicationDocumentWithUser } from "@/lib/applications/document-types";

const appearance = {
  notUploaded: { icon: CircleDashed, className: "text-muted-foreground" },
  pending: {
    icon: Clock3,
    className:
      "border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  approved: {
    icon: CheckCircle2,
    className:
      "border-green-600/30 bg-green-500/10 text-green-800 dark:text-green-300",
  },
  rejected: {
    icon: XCircle,
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

export function ApplicationDocumentStatus({
  status,
}: {
  status: ApplicationDocumentWithUser["status"] | "notUploaded";
}) {
  const t = useTranslations("Applications.documents");
  const { icon: Icon, className } = appearance[status];
  return (
    <Badge role="status" variant="outline" className={className}>
      <Icon aria-hidden="true" />
      {t(`status.${status}`)}
    </Badge>
  );
}
