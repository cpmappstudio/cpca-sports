"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/table/data-table";
import {
  createBasketballTeamColumns,
  createBasketballTeamFilterConfigs,
  type BasketballTeamRow,
} from "./teams-columns";
import { ROUTES } from "@/lib/navigation/routes";

interface BasketballTeamsTableProps {
  preloadedData: any; // TODO: Type this properly when Convex is implemented
  orgSlug: string;
}

export function BasketballTeamsTable({
  preloadedData,
  orgSlug,
}: BasketballTeamsTableProps) {
  const router = useRouter();
  const t = useTranslations("Common");
  const data: BasketballTeamRow[] = preloadedData; // TODO: Use usePreloadedQuery when Convex is ready
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleRowClick = (team: BasketballTeamRow) => {
    router.push(ROUTES.org.teams.detail(orgSlug, team._id));
  };

  const teamColumns = createBasketballTeamColumns(t);
  const teamFilterConfigs = createBasketballTeamFilterConfigs(t);

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
