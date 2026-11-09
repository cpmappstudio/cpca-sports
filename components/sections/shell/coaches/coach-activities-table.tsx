"use client";

import { useMemo } from "react";
import type { ColumnDef, SortingState, Table } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/table/data-table";
import { createSortableHeader } from "@/components/table/column-helpers";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "@/convex/_generated/dataModel";
import type { CursorPagination } from "@/lib/table/types";
import type { CoachActivityListItem } from "@/lib/coaches/types";
import { ActivityActions } from "./activity-actions";
import {
  ActivityCheckout,
  ActivityDuration,
  ActivityName,
  ActivityTime,
} from "./activity-table-cells";

type ActivityHandler = (activityId: Id<"coachActivities">) => void;

export function CoachActivitiesTable({
  data,
  isLoading,
  emptyMessage,
  completed,
  pagination,
  sorting,
  onSortingChange,
  onView,
  onEdit,
  onDelete,
  onCheckout,
}: {
  data: CoachActivityListItem[];
  isLoading: boolean;
  emptyMessage?: string;
  completed: boolean;
  pagination?: CursorPagination;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  onView: ActivityHandler;
  onEdit: ActivityHandler;
  onDelete: ActivityHandler;
  onCheckout: ActivityHandler;
}) {
  const t = useTranslations("Coaches.detail");
  const columns = useMemo<ColumnDef<CoachActivityListItem, unknown>[]>(() => {
    const metadata = {
      className: "hidden px-3 py-4 whitespace-normal break-words md:table-cell",
      headerClassName: "py-3 text-xs",
    };
    const header = (key: string) =>
      createSortableHeader(t(key), {
        className: "min-h-11 hover:text-primary",
      });
    return [
      {
        id: "summary",
        header: ({ table }) => (
          <MobileSort table={table} completed={completed} />
        ),
        enableSorting: false,
        meta: {
          className: "px-3 py-4 whitespace-normal break-words md:hidden",
          headerClassName: "py-1 text-xs",
        },
        cell: ({ row }) => (
          <div className="min-w-0 space-y-3">
            <ActivityName activity={row.original} />
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
              {row.original.placeName}
            </p>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("entry")}</p>
              <ActivityTime activity={row.original} kind="entry" />
            </div>
            {completed ? (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("exit")}</p>
                  <ActivityTime activity={row.original} kind="exit" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {t("duration")}
                  </p>
                  <ActivityDuration durationMs={row.original.durationMs} />
                </div>
              </>
            ) : null}
          </div>
        ),
      },
      {
        id: "title",
        accessorFn: (row) => row.title.trim().toLowerCase(),
        sortingFn: "text",
        header: header("activityColumn"),
        meta: metadata,
        cell: ({ row }) => <ActivityName activity={row.original} />,
      },
      {
        id: "placeName",
        accessorFn: (row) => row.placeName.trim().toLowerCase(),
        sortingFn: "text",
        header: header("placeColumn"),
        meta: metadata,
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            {row.original.placeName}
          </span>
        ),
      },
      {
        id: "checkIn",
        accessorFn: (row) => row.checkInOrder ?? Number.NEGATIVE_INFINITY,
        sortingFn: "basic",
        header: header("entry"),
        meta: metadata,
        cell: ({ row }) => (
          <ActivityTime activity={row.original} kind="entry" />
        ),
      },
      ...(completed
        ? ([
            {
              id: "checkOut",
              accessorFn: (row) =>
                row.checkOutOrder ?? Number.NEGATIVE_INFINITY,
              sortingFn: "basic",
              header: header("exit"),
              meta: metadata,
              cell: ({ row }) => (
                <ActivityTime activity={row.original} kind="exit" />
              ),
            },
            {
              id: "duration",
              header: t("duration"),
              enableSorting: false,
              meta: metadata,
              cell: ({ row }) => (
                <ActivityDuration durationMs={row.original.durationMs} />
              ),
            },
          ] satisfies ColumnDef<CoachActivityListItem, unknown>[])
        : []),
      {
        id: "actions",
        header: t("actionsColumn"),
        enableSorting: false,
        meta: {
          className: "w-11 px-3 py-4 align-top md:align-middle",
          headerClassName: "py-3 text-right text-xs",
        },
        cell: ({ row }) => (
          <div className="flex flex-col items-end justify-end gap-2 md:flex-row md:items-center md:gap-1">
            {row.original.status === "in_progress" ? (
              <div className="order-2 md:order-1">
                <ActivityCheckout
                  onCheckout={() => onCheckout(row.original._id)}
                />
              </div>
            ) : null}
            <div className="order-1 md:order-2">
              <ActivityActions
                onEdit={() => onEdit(row.original._id)}
                onDelete={() => onDelete(row.original._id)}
              />
            </div>
          </div>
        ),
      },
    ];
  }, [completed, onCheckout, onDelete, onEdit, t]);

  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(activity) => activity._id}
      cursorPagination={pagination}
      pageSize={10}
      sorting={sorting}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      loadingMessage={t("loadingActivities")}
      emptyMessage={
        emptyMessage ?? t(completed ? "emptyHistory" : "emptyOpenActivities")
      }
      previousLabel={t("previousPage")}
      nextLabel={t("nextPage")}
      variant="plain"
      showColumnSelector={false}
      ariaLabel={t(completed ? "activityHistory" : "openActivities")}
      onRowClick={(activity) => onView(activity._id)}
      enableKeyboardRowActivation
    />
  );
}

function MobileSort({
  table,
  completed,
}: {
  table: Table<CoachActivityListItem>;
  completed: boolean;
}) {
  const t = useTranslations("Coaches.detail");
  const current = table.getState().sorting[0];
  const options = [
    { id: "title", label: t("activityColumn") },
    { id: "placeName", label: t("placeColumn") },
    { id: "checkIn", label: t("entry") },
    ...(completed ? [{ id: "checkOut", label: t("exit") }] : []),
  ];
  return (
    <div className="flex items-center gap-1">
      <Select
        value={current?.id}
        onValueChange={(id) =>
          table.setSorting([
            { id, desc: id === "checkIn" || id === "checkOut" },
          ])
        }
      >
        <SelectTrigger
          aria-label={t("sortBy")}
          className="h-auto min-h-11 min-w-0 border-0 bg-transparent px-0 shadow-none text-xs"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="min-h-11 min-w-11"
        aria-label={t(current?.desc ? "sortAscending" : "sortDescending")}
        onClick={() =>
          table.setSorting([
            { id: current?.id ?? "checkIn", desc: !current?.desc },
          ])
        }
      >
        {current?.desc ? <ArrowDown /> : <ArrowUp />}
      </Button>
    </div>
  );
}
