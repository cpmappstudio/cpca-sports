"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Preloaded, usePreloadedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { DataTable } from "@/components/table/data-table";
import { OrganizationForm } from "@/components/forms/organization-form";
import {
    createOrganizationColumns,
    createOrganizationFilterConfigs,
    type OrganizationRow,
} from "@/components/sections/shell/organizations/columns";
import { ROUTES } from "@/lib/routes";

interface OrganizationsTableProps {
    preloadedData: Preloaded<typeof api.organizations.listAll>;
}

export function OrganizationsTable({ preloadedData }: OrganizationsTableProps) {
    const router = useRouter();
    const t = useTranslations("Common");
    const data = usePreloadedQuery(preloadedData);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const handleRowClick = (org: OrganizationRow) => {
        router.push(ROUTES.admin.organizations.detail(org._id));
    };

    const organizationColumns = createOrganizationColumns(t);
    const organizationFilterConfigs = createOrganizationFilterConfigs(t);

    return (
        <>
            <DataTable
                columns={organizationColumns}
                data={data}
                filterColumn="search"
                filterPlaceholder={t("organizations.searchPlaceholder")}
                filterConfigs={organizationFilterConfigs}
                emptyMessage={t("organizations.emptyMessage")}
                columnsMenuLabel={t("table.columns")}
                filtersMenuLabel={t("table.filters")}
                previousLabel={t("actions.previous")}
                nextLabel={t("actions.next")}
                onCreate={() => setIsCreateOpen(true)}
                onRowClick={handleRowClick}
            />

            <OrganizationForm
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
            />
        </>
    );
}
