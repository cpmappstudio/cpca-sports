import { ColumnDef } from "@tanstack/react-table";
import { Id } from "@/convex/_generated/dataModel";
import {
  createSearchColumn,
  createSortableHeader,
} from "@/components/table/column-helpers";
import type { FilterConfig } from "@/lib/table/types";
import { BuildingLibraryIcon } from "@heroicons/react/20/solid";

export interface BasketballTeamRow {
  _id: Id<"clubs">;
  _creationTime: number;
  name: string;
  slug: string;
  shortName?: string;
  logoUrl?: string;
  status: "affiliated" | "invited" | "suspended";
  foundedYear?: number;
  headquarters?: string;
}

type Translator = (key: string) => string;

const STATUS_STYLES: Record<string, string> = {
  affiliated:
    "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950",
  invited: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
  suspended: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950",
};

export function createBasketballTeamColumns(
  t: Translator
): ColumnDef<BasketballTeamRow>[] {
  return [
    createSearchColumn<BasketballTeamRow>(["name", "shortName", "headquarters"]),

    {
      accessorKey: "name",
      header: createSortableHeader(t("teams.name")),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.logoUrl ? (
            <img
              src={row.original.logoUrl}
              alt={row.original.name}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <BuildingLibraryIcon className="h-5 w-5" />
            </div>
          )}
          <div>
            <span className="font-medium">{row.original.name}</span>
            {row.original.shortName && (
              <p className="text-xs text-muted-foreground">
                {row.original.shortName}
              </p>
            )}
          </div>
        </div>
      ),
    },

    {
      accessorKey: "headquarters",
      header: createSortableHeader(t("teams.headquarters")),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.headquarters || "—"}
        </span>
      ),
    },

    {
      accessorKey: "foundedYear",
      header: createSortableHeader(t("teams.foundedYear")),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.foundedYear || "—"}</span>
      ),
    },

    {
      accessorKey: "status",
      header: createSortableHeader(t("teams.status")),
      cell: ({ row }) => {
        const status = row.original.status;
        const className = STATUS_STYLES[status] ?? STATUS_STYLES.affiliated;

        return (
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${className}`}
          >
            {t(`teams.statusOptions.${status}`)}
          </span>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
  ];
}

export function createBasketballTeamFilterConfigs(
  t: Translator
): FilterConfig[] {
  return [
    {
      id: "status",
      label: t("teams.status"),
      options: [
        { value: "affiliated", label: t("teams.statusOptions.affiliated") },
        { value: "invited", label: t("teams.statusOptions.invited") },
        { value: "suspended", label: t("teams.statusOptions.suspended") },
      ],
    },
  ];
}
