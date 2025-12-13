"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Preloaded, usePreloadedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { DataTable } from "@/components/table/data-table";
import { StaffForm } from "@/components/forms/StaffForm";
import {
    createStaffColumns,
    createStaffFilterConfigs,
    type StaffRow,
} from "@/components/sections/shell/staff/columns";
import { ROUTES } from "@/lib/routes";

interface StaffTableProps {
    preloadedData: Preloaded<typeof api.staff.listByClubSlug>;
    clubSlug: string;
    leagueSlug: string;
}

export function StaffTable({
    preloadedData,
    clubSlug,
    leagueSlug,
}: StaffTableProps) {
    const router = useRouter();
    const t = useTranslations("Common");
    const data = usePreloadedQuery(preloadedData);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const { staff } = data!;

    const handleRowClick = (member: StaffRow) => {
        router.push(
            ROUTES.club.staff.detail(leagueSlug, clubSlug, member.profileId)
        );
    };

    const staffColumns = createStaffColumns(t);
    const staffFilterConfigs = createStaffFilterConfigs(t);

    return (
        <>
            <DataTable
                columns={staffColumns}
                data={staff}
                filterColumn="search"
                filterPlaceholder={t("staff.searchPlaceholder")}
                filterConfigs={staffFilterConfigs}
                emptyMessage={t("staff.emptyMessage")}
                columnsMenuLabel={t("table.columns")}
                filtersMenuLabel={t("table.filters")}
                previousLabel={t("actions.previous")}
                nextLabel={t("actions.next")}
                onCreate={() => setIsCreateOpen(true)}
                onRowClick={handleRowClick}
            />

            <StaffForm
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                clubSlug={clubSlug}
            />
        </>
    );
}
