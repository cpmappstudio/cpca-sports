"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/table/data-table";
import {
  createSoccerTeamColumns,
  createSoccerTeamFilterConfigs,
  type SoccerTeamRow,
} from "./teams-columns";
import { ROUTES } from "@/lib/navigation/routes";

interface SoccerTeamsTableProps {
  preloadedData: any; // TODO: Type this properly when Convex is implemented
  orgSlug: string;
}

export function SoccerTeamsTable({
  preloadedData,
  orgSlug,
}: SoccerTeamsTableProps) {
  const router = useRouter();
  const t = useTranslations("Common");
  const data: SoccerTeamRow[] = preloadedData; // TODO: Use usePreloadedQuery when Convex is ready
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleRowClick = (team: SoccerTeamRow) => {
    router.push(ROUTES.org.teams.detail(orgSlug, team._id));
  };

  const teamColumns = createSoccerTeamColumns(t);
  const teamFilterConfigs = createSoccerTeamFilterConfigs(t);

  return (
    <>
      <DataTable
        columns={teamColumns}
        data={data}
        filterColumn="search"
        filterPlaceholder={t("teams.searchPlaceholder")}
        filterConfigs={teamFilterConfigs}
        emptyMessage={t("teams.emptyMessage")}
        columnsMenuLabel={t("table.columns")}
        filtersMenuLabel={t("table.filters")}
        previousLabel={t("actions.previous")}
        nextLabel={t("actions.next")}
        onCreate={() => setIsCreateOpen(true)}
        onRowClick={handleRowClick}
      />

      {/* TODO: Add TeamForm component when ready */}
    </>
  );
}
