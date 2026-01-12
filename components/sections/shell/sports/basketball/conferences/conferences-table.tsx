"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Preloaded, usePreloadedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { DataTable } from "@/components/table/data-table";
import {
  createConferenceColumns,
  createConferenceFilterConfigs,
  type ConferenceRow,
} from "./columns";
import { CreateConferenceDialog } from "./create-conference-dialog";
import { ROUTES } from "@/lib/navigation/routes";

interface ConferencesTableProps {
  preloadedData: Preloaded<typeof api.conferences.listByLeague>;
  orgSlug: string;
}

export function ConferencesTable({
  preloadedData,
  orgSlug,
}: ConferencesTableProps) {
  const router = useRouter();
  const t = useTranslations("Common");
  const data = usePreloadedQuery(preloadedData);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleRowClick = (conference: ConferenceRow) => {
    router.push(ROUTES.org.divisions.detail(orgSlug, conference.slug));
  };

  const conferenceColumns = createConferenceColumns(t);
  const conferenceFilterConfigs = createConferenceFilterConfigs(t);

  return (
    <>
      <DataTable
        columns={conferenceColumns}
        data={data}
        filterColumn="search"
        filterPlaceholder={t("conferences.searchPlaceholder")}
        filterConfigs={conferenceFilterConfigs}
        emptyMessage={t("conferences.emptyMessage")}
        columnsMenuLabel={t("table.columns")}
        filtersMenuLabel={t("table.filters")}
        previousLabel={t("actions.previous")}
        nextLabel={t("actions.next")}
        onCreate={() => setIsCreateOpen(true)}
        onRowClick={handleRowClick}
      />

      <CreateConferenceDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        orgSlug={orgSlug}
      />
    </>
  );
}
