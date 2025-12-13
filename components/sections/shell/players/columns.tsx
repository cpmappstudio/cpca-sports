import { ColumnDef } from "@tanstack/react-table";
import { Id } from "@/convex/_generated/dataModel";
import {
    createSearchColumn,
    createSortableHeader,
} from "@/components/table/column-helpers";
import type { FilterConfig } from "@/lib/table/types";

export interface PlayerRow {
    _id: Id<"players">;
    _creationTime: number;
    profileId: Id<"profiles">;
    fullName: string;
    avatarUrl?: string;
    dateOfBirth?: string;
    position?: "goalkeeper" | "defender" | "midfielder" | "forward";
    jerseyNumber?: number;
    status: "active" | "injured" | "on_loan" | "inactive";
    currentCategoryId?: Id<"categories">;
    categoryName?: string;
}

type Translator = (key: string) => string;

const STATUS_STYLES: Record<string, string> = {
    active: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950",
    injured: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950",
    on_loan: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
    inactive: "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800",
};

export function createPlayerColumns(t: Translator): ColumnDef<PlayerRow>[] {
    return [
        createSearchColumn<PlayerRow>(["fullName", "categoryName"]),

        {
            accessorKey: "fullName",
            header: createSortableHeader(t("players.name")),
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
            accessorKey: "categoryName",
            header: createSortableHeader(t("players.team")),
            cell: ({ row }) => row.original.categoryName ?? t("players.notAssigned"),
        },

        {
            accessorKey: "position",
            header: t("players.position"),
            cell: ({ row }) => {
                const position = row.original.position;
                return position ? t(`position.${position}`) : "—";
            },
            filterFn: (row, id, value: string[]) => {
                const position = row.getValue(id) as string | undefined;
                return position ? value.includes(position) : false;
            },
        },

        {
            accessorKey: "jerseyNumber",
            header: () => <div className="text-center">#</div>,
            cell: ({ row }) => (
                <div className="text-center font-medium">
                    {row.original.jerseyNumber ?? "—"}
                </div>
            ),
        },

        {
            accessorKey: "status",
            header: t("players.status"),
            cell: ({ row }) => {
                const status = row.original.status;
                const className = STATUS_STYLES[status] ?? "";
                return (
                    <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${className}`}
                    >
                        {t(`playerStatus.${status}`)}
                    </span>
                );
            },
            filterFn: (row, id, value: string[]) => {
                return value.includes(row.getValue(id));
            },
        },
    ];
}

export function createPlayerFilterConfigs(t: Translator): FilterConfig[] {
    return [
        {
            id: "position",
            label: t("players.position"),
            options: [
                { value: "goalkeeper", label: t("position.goalkeeper") },
                { value: "defender", label: t("position.defender") },
                { value: "midfielder", label: t("position.midfielder") },
                { value: "forward", label: t("position.forward") },
            ],
        },
        {
            id: "status",
            label: t("players.status"),
            options: [
                { value: "active", label: t("playerStatus.active") },
                { value: "injured", label: t("playerStatus.injured") },
                { value: "on_loan", label: t("playerStatus.on_loan") },
                { value: "inactive", label: t("playerStatus.inactive") },
            ],
        },
    ];
}
