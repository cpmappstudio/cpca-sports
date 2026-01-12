import { ColumnDef } from "@tanstack/react-table";
import { Id } from "@/convex/_generated/dataModel";
import {
  createSearchColumn,
  createSortableHeader,
} from "@/components/table/column-helpers";
import type { FilterConfig } from "@/lib/table/types";
import { BuildingOffice2Icon } from "@heroicons/react/20/solid";

export interface ConferenceRow {
  _id: Id<"conferences">;
  _creationTime: number;
  name: string;
  slug: string;
  shortName?: string;
  region?: string;
  divisions?: string[];
  teamsCount: number;
}

type Translator = (key: string) => string;

export function createConferenceColumns(
  t: Translator,
): ColumnDef<ConferenceRow>[] {
  return [
    createSearchColumn<ConferenceRow>(["name", "shortName", "region"]),

    {
      accessorKey: "name",
      header: createSortableHeader(t("conferences.name")),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <BuildingOffice2Icon className="h-5 w-5" />
          </div>
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
      accessorKey: "region",
      header: createSortableHeader(t("conferences.region")),
      cell: ({ row }) => (
        <div className="font-medium">{row.original.region || "—"}</div>
      ),
    },

    {
      accessorKey: "divisions",
      header: t("conferences.divisions"),
      cell: ({ row }) => {
        const divisions = row.original.divisions;
        if (!divisions || divisions.length === 0) return "—";
        return (
          <div className="flex flex-wrap gap-1">
            {divisions.map((div) => (
              <span
                key={div}
                className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
              >
                {div}
              </span>
            ))}
          </div>
        );
      },
    },

    {
      accessorKey: "teamsCount",
      header: () => <div className="text-center">{t("conferences.teams")}</div>,
      cell: ({ row }) => (
        <div className="text-center font-medium">{row.original.teamsCount}</div>
      ),
    },
  ];
}

export function createConferenceFilterConfigs(t: Translator): FilterConfig[] {
  return [];
}
