"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Preloaded, usePreloadedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { DataTable } from "@/components/table/data-table";
import {
    createDivisionColumns,
    createDivisionFilterConfigs,
    type DivisionRow,
} from "@/components/sections/shell/divisions/columns";
import { ROUTES } from "@/lib/navigation/routes";

interface DivisionsTableProps {
    preloadedData: Preloaded<typeof api.divisions.listByLeagueSlug>;
    orgSlug: string;
}

export function DivisionsTable({ preloadedData, orgSlug }: DivisionsTableProps) {
    const router = useRouter();
    const t = useTranslations("Common");
    const data = usePreloadedQuery(preloadedData);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const handleRowClick = (division: DivisionRow) => {
        router.push(ROUTES.org.divisions.detail(orgSlug, division._id));
    };

    const divisionColumns = createDivisionColumns(t);
    const divisionFilterConfigs = createDivisionFilterConfigs(t);

    return (
        <>
            <DataTable
                columns={divisionColumns}
                data={data}
                filterColumn="search"
                filterPlaceholder={t("divisions.searchPlaceholder")}
                filterConfigs={divisionFilterConfigs}
                emptyMessage={t("divisions.emptyMessage")}
                columnsMenuLabel={t("table.columns")}
                filtersMenuLabel={t("table.filters")}
                previousLabel={t("actions.previous")}
                nextLabel={t("actions.next")}
                onCreate={() => setIsCreateOpen(true)}
                onRowClick={handleRowClick}
            />

            {/* TODO: Add DivisionForm component when ready */}
            {/* <DivisionForm
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                orgSlug={orgSlug}
            /> */}
        </>
    );
}
