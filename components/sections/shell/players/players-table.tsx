"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Preloaded, usePreloadedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { DataTable } from "@/components/table/data-table";
import { PlayerForm } from "@/components/forms/player-form";
import {
    createPlayerColumns,
    createPlayerFilterConfigs,
    type PlayerRow,
} from "@/components/sections/shell/players/columns";
import { ROUTES } from "@/lib/routes";

interface PlayersTableProps {
    preloadedData: Preloaded<typeof api.players.listByClubSlug>;
    clubSlug: string;
    leagueSlug: string;
}

export function PlayersTable({
    preloadedData,
    clubSlug,
    leagueSlug,
}: PlayersTableProps) {
    const router = useRouter();
    const t = useTranslations("Common");
    const data = usePreloadedQuery(preloadedData);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const { players } = data!;

    const handleRowClick = (player: PlayerRow) => {
        router.push(
            ROUTES.club.players.detail(leagueSlug, clubSlug, player._id)
        );
    };

    const playerColumns = createPlayerColumns(t);
    const playerFilterConfigs = createPlayerFilterConfigs(t);

    return (
        <>
            <DataTable
                columns={playerColumns}
                data={players}
                filterColumn="search"
                filterPlaceholder={t("players.searchPlaceholder")}
                filterConfigs={playerFilterConfigs}
                emptyMessage={t("players.emptyMessage")}
                columnsMenuLabel={t("table.columns")}
                filtersMenuLabel={t("table.filters")}
                previousLabel={t("actions.previous")}
                nextLabel={t("actions.next")}
                onCreate={() => setIsCreateOpen(true)}
                onRowClick={handleRowClick}
            />

            <PlayerForm
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                clubSlug={clubSlug}
            />
        </>
    );
}
