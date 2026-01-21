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
  status: "draft" | "upcoming" | "ongoing" | "completed" | "cancelled";
  ageGroups: string[];
  conferences: string[];
  gender: "male" | "female" | "mixed";
  registrationDeadline?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
}

type Translator = (key: string) => string;

const STATUS_STYLES: Record<string, string> = {
  draft: "text-gray-700 bg-gray-50 dark:text-gray-400 dark:bg-gray-800",
  upcoming: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
  ongoing: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950",
  completed:
    "text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-950",
  cancelled: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950",
};

export function createTournamentColumns(
  t: Translator,
): ColumnDef<TournamentRow>[] {
  return [
    createSearchColumn<TournamentRow>(["name", "slug", "location"]),

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
      accessorKey: "registrationDeadline",
      header: createSortableHeader(t("tournaments.registrationDeadline")),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.registrationDeadline
            ? new Date(row.original.registrationDeadline).toLocaleDateString()
            : "—"}
        </span>
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
      accessorKey: "ageGroups",
      header: t("tournaments.ageGroup"),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.ageGroups.length > 2
            ? `${row.original.ageGroups.slice(0, 2).join(", ")}...`
            : row.original.ageGroups.join(", ")}
        </span>
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
      accessorKey: "conferences",
      header: t("conferences.title"),
      cell: ({ row }) => {
        const conferences = row.original.conferences || [];
        return (
          <span className="text-sm">
            {conferences.length === 0
              ? "—"
              : conferences.length > 2
                ? `${conferences.slice(0, 2).join(", ")}...`
                : conferences.join(", ")}
          </span>
        );
      },
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
