import { ColumnDef } from "@tanstack/react-table";
import { Id } from "@/convex/_generated/dataModel";
import {
  createSearchColumn,
  createSortableHeader,
} from "@/components/table/column-helpers";
import type { FilterConfig } from "@/lib/table/types";
import { TrophyIcon } from "@heroicons/react/20/solid";

export interface DivisionRow {
  _id: Id<"divisions">;
  _creationTime: number;
  name: string;
  displayName: string;
  description?: string;
  level: number;
  imageUrl?: string;
  minWinPercentage?: number;
  minGamesPlayed?: number;
}

type Translator = (key: string) => string;

const LEVEL_STYLES: Record<number, string> = {
  1: "text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950",
  2: "text-gray-700 bg-gray-50 dark:text-gray-400 dark:bg-gray-800",
  3: "text-orange-700 bg-orange-50 dark:text-orange-400 dark:bg-orange-950",
  4: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
};

export function createDivisionColumns(t: Translator): ColumnDef<DivisionRow>[] {
  return [
    createSearchColumn<DivisionRow>(["name", "displayName", "description"]),

    {
      accessorKey: "displayName",
      header: createSortableHeader(t("divisions.displayName")),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.imageUrl ? (
            <img
              src={row.original.imageUrl}
              alt={row.original.displayName}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <TrophyIcon className="h-5 w-5" />
            </div>
          )}
          <div>
            <span className="font-medium">{row.original.displayName}</span>
            <p className="text-xs text-muted-foreground">
              {row.original.description || row.original.name}
            </p>
          </div>
        </div>
      ),
    },

    {
      accessorKey: "level",
      header: createSortableHeader(t("divisions.level")),
      cell: ({ row }) => {
        const level = row.original.level;
        const className = LEVEL_STYLES[level] ?? LEVEL_STYLES[4];
        const levelNames = ["A", "B", "C", "D"];
        const levelName = levelNames[level - 1] || `Level ${level}`;

        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${className}`}
          >
            <TrophyIcon className="h-3 w-3" />
            {t("divisions.name")} {levelName}
          </span>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },

    {
      accessorKey: "minWinPercentage",
      header: () => (
        <div className="text-center">{t("divisions.minWinPercentage")}</div>
      ),
      cell: ({ row }) => (
        <div className="text-center font-medium">
          {row.original.minWinPercentage !== undefined
            ? `${row.original.minWinPercentage}%`
            : "—"}
        </div>
      ),
    },

    {
      accessorKey: "minGamesPlayed",
      header: () => (
        <div className="text-center">{t("divisions.minGamesPlayed")}</div>
      ),
      cell: ({ row }) => (
        <div className="text-center font-medium">
          {row.original.minGamesPlayed ?? "—"}
        </div>
      ),
    },
  ];
}

export function createDivisionFilterConfigs(t: Translator): FilterConfig[] {
  return [
    {
      id: "level",
      label: t("divisions.level"),
      options: [
        { value: "1", label: `${t("divisions.name")} A` },
        { value: "2", label: `${t("divisions.name")} B` },
        { value: "3", label: `${t("divisions.name")} C` },
        { value: "4", label: `${t("divisions.name")} D` },
      ],
    },
  ];
}
