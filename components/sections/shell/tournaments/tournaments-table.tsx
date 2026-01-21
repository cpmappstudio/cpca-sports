"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DataTable } from "@/components/table/data-table";
import {
  createTournamentColumns,
  createTournamentFilterConfigs,
  type TournamentRow,
} from "@/components/sections/shell/tournaments/columns";
import { CreateTournamentDialog } from "./create-tournament-dialog";
import { ROUTES } from "@/lib/navigation/routes";

interface TournamentsTableProps {
  preloadedData: Preloaded<typeof api.tournaments.listByLeagueSlug>;
  orgSlug: string;
}

export function TournamentsTable({
  preloadedData,
  orgSlug,
}: TournamentsTableProps) {
  const router = useRouter();
  const t = useTranslations("Common");
  const data = usePreloadedQuery(preloadedData);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleRowClick = (tournament: TournamentRow) => {
    router.push(ROUTES.org.tournaments.detail(orgSlug, tournament._id));
  };

  const tournamentColumns = createTournamentColumns(t);
  const tournamentFilterConfigs = createTournamentFilterConfigs(t);

  return (
    <>
      <DataTable
        columns={tournamentColumns}
        data={data as TournamentRow[]}
        filterColumn="search"
        filterPlaceholder={t("tournaments.searchPlaceholder")}
        filterConfigs={tournamentFilterConfigs}
        emptyMessage={t("tournaments.emptyMessage")}
        columnsMenuLabel={t("table.columns")}
        filtersMenuLabel={t("table.filters")}
        previousLabel={t("actions.previous")}
        nextLabel={t("actions.next")}
        onCreate={() => setIsCreateOpen(true)}
        onRowClick={handleRowClick}
      />

      <CreateTournamentDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        orgSlug={orgSlug}
      />
    </>
  );
}
