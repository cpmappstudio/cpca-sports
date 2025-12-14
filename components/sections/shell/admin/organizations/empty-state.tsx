"use client";

import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CreateOrganizationDialog } from "./create-dialog";

export function OrganizationEmptyState() {
  const t = useTranslations("Admin.organizations");

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Building2 />
        </EmptyMedia>
        <EmptyTitle>{t("empty")}</EmptyTitle>
        <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <CreateOrganizationDialog />
      </EmptyContent>
    </Empty>
  );
}
