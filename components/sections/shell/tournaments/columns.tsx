import { ColumnDef } from "@tanstack/react-table";
import { Id } from "@/convex/_generated/dataModel";
import {
    createSearchColumn,
    createSortableHeader,
} from "@/components/table/column-helpers";
import type { FilterConfig } from "@/lib/table/types";
import { CalendarIcon } from "@heroicons/react/20/solid";

export interface TournamentRow {
    _id: Id<"tournaments">;
    _creationTime: number;
    name: string;
    slug: string;
    description?: string;
    season: string;
    status: "draft" | "upcoming" | "ongoing" | "completed" | "cancelled";
    ageGroup: string;
    gender: "male" | "female" | "mixed";
    startDate?: string;
    endDate?: string;
    enableDivisions: boolean;
}

type Translator = (key: string) => string;

const STATUS_STYLES: Record<string, string> = {
    draft: "text-gray-700 bg-gray-50 dark:text-gray-400 dark:bg-gray-800",
    upcoming: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
    ongoing: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950",
    completed: "text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-950",
    cancelled: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950",
};

export function createTournamentColumns(t: Translator): ColumnDef<TournamentRow>[] {
    return [
        createSearchColumn<TournamentRow>(["name", "slug", "season", "ageGroup"]),

        {
            accessorKey: "name",
            header: createSortableHeader(t("tournaments.name")),
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <span className="font-medium">{row.original.name}</span>
                        <p className="text-xs text-muted-foreground">
                            {row.original.description || row.original.slug}
                        </p>
                    </div>
                </div>
            ),
        },

        {
            accessorKey: "season",
            header: createSortableHeader(t("tournaments.season")),
            cell: ({ row }) => (
                <span className="font-medium">{row.original.season}</span>
            ),
        },

        {
            accessorKey: "status",
            header: t("tournaments.status"),
            cell: ({ row }) => {
                const status = row.original.status;
                const className = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
                return (
                    <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${className}`}
                    >
                        {t(`tournamentStatus.${status}`)}
                    </span>
                );
            },
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id));
            },
        },

        {
            accessorKey: "ageGroup",
            header: t("tournaments.ageGroup"),
            cell: ({ row }) => (
                <span className="text-sm">{row.original.ageGroup}</span>
            ),
        },

        {
            accessorKey: "gender",
            header: t("tournaments.gender"),
            cell: ({ row }) => (
                <span className="text-sm">{t(`gender.${row.original.gender}`)}</span>
            ),
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id));
            },
        },

        {
            accessorKey: "enableDivisions",
            header: () => <div className="text-center">{t("tournaments.enableDivisions")}</div>,
            cell: ({ row }) => (
                <div className="text-center">
                    {row.original.enableDivisions ? (
                        <span className="text-green-600 dark:text-green-400">✓</span>
                    ) : (
                        <span className="text-gray-400">—</span>
                    )}
                </div>
            ),
        },
    ];
}

export function createTournamentFilterConfigs(t: Translator): FilterConfig[] {
    return [
        {
            id: "status",
            label: t("tournaments.status"),
            options: [
                { value: "draft", label: t("tournamentStatus.draft") },
                { value: "upcoming", label: t("tournamentStatus.upcoming") },
                { value: "ongoing", label: t("tournamentStatus.ongoing") },
                { value: "completed", label: t("tournamentStatus.completed") },
                { value: "cancelled", label: t("tournamentStatus.cancelled") },
            ],
        },
        {
            id: "gender",
            label: t("tournaments.gender"),
            options: [
                { value: "male", label: t("gender.male") },
                { value: "female", label: t("gender.female") },
                { value: "mixed", label: t("gender.mixed") },
            ],
        },
    ];
}
