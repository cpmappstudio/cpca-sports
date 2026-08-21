"use client";

import { useMemo } from "react";
import Image from "next/image";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { createSortableHeader } from "@/components/table/column-helpers";
import type { CoachListItem } from "@/lib/coaches/types";
import type { FilterConfig } from "@/lib/table/types";
import { getProgramIcon } from "@/lib/programs/icon-catalog";
import { useTranslations } from "next-intl";

export function useCoachColumns(): ColumnDef<CoachListItem, unknown>[] {
  const t = useTranslations("Coaches.table");
  return useMemo(
    () => [
      {
        accessorKey: "fullName",
        header: createSortableHeader(t("coach")),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.imageUrl ? (
              <Image
                src={row.original.imageUrl}
                alt=""
                width={40}
                height={40}
                unoptimized
                className="size-10 rounded-md object-cover"
              />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground">
                {row.original.firstName[0]}
                {row.original.lastName[0]}
              </div>
            )}
            <div>
              <p className="font-medium">{row.original.fullName}</p>
              <p className="text-xs text-muted-foreground">
                {row.original.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "programName",
        header: createSortableHeader(t("program")),
        cell: ({ row }) => {
          const Icon = getProgramIcon(row.original.programIconKey);
          return (
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-muted-foreground" />
              <span>{row.original.programName}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "positionName",
        header: createSortableHeader(t("position")),
      },
      {
        accessorKey: "isActive",
        header: t("status"),
        filterFn: (row, id, value: string[]) =>
          value.includes(String(row.getValue(id))),
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge>{t("active")}</Badge>
          ) : (
            <Badge variant="secondary">{t("inactive")}</Badge>
          ),
      },
    ],
    [t],
  );
}

export function useCoachFilters(coaches: CoachListItem[]): FilterConfig[] {
  const t = useTranslations("Coaches.table");
  return useMemo(() => {
    const programs = [
      ...new Set(coaches.map((coach) => coach.programName)),
    ].sort();
    return [
      {
        id: "isActive",
        label: t("status"),
        options: [
          { value: "true", label: t("active") },
          { value: "false", label: t("inactive") },
        ],
      },
      {
        id: "programName",
        label: t("program"),
        options: programs.map((program) => ({
          value: program,
          label: program,
        })),
      },
    ];
  }, [coaches, t]);
}
