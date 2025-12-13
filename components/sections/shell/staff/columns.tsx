import { ColumnDef } from "@tanstack/react-table";
import { Id } from "@/convex/_generated/dataModel";
import {
    createSearchColumn,
    createSortableHeader,
} from "@/components/table/column-helpers";
import type { FilterConfig } from "@/lib/table/types";

export interface StaffRow {
    _id: Id<"categories">;
    _creationTime: number;
    profileId: Id<"profiles">;
    fullName: string;
    avatarUrl?: string;
    role: string;
    categoryName?: string;
}

type Translator = (key: string) => string;

const ROLE_STYLES: Record<string, string> = {
    technical_director: "text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-950",
    assistant_coach: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
};

export function createStaffColumns(t: Translator): ColumnDef<StaffRow>[] {
    return [
        createSearchColumn<StaffRow>(["fullName", "categoryName"]),

        {
            accessorKey: "fullName",
            header: createSortableHeader(t("staff.name")),
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    {row.original.avatarUrl ? (
                        <img
                            src={row.original.avatarUrl}
                            alt={row.original.fullName}
                            className="h-8 w-8 rounded-full object-cover"
                        />
                    ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                            {row.original.fullName[0]?.toUpperCase() || "?"}
                        </div>
                    )}
                    <span className="font-medium">{row.original.fullName}</span>
                </div>
            ),
        },

        {
            accessorKey: "role",
            header: t("staff.role"),
            cell: ({ row }) => {
                const role = row.original.role;
                const className = ROLE_STYLES[role] ?? "";
                return (
                    <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${className}`}
                    >
                        {t(`staffRole.${role}`)}
                    </span>
                );
            },
            filterFn: (row, id, value: string[]) => {
                return value.includes(row.getValue(id));
            },
        },

        {
            accessorKey: "categoryName",
            header: createSortableHeader(t("staff.team")),
            cell: ({ row }) => row.original.categoryName ?? t("staff.notAssigned"),
        },
    ];
}

export function createStaffFilterConfigs(t: Translator): FilterConfig[] {
    return [
        {
            id: "role",
            label: t("staff.role"),
            options: [
                { value: "technical_director", label: t("staffRole.technical_director") },
                { value: "assistant_coach", label: t("staffRole.assistant_coach") },
            ],
        },
    ];
}
