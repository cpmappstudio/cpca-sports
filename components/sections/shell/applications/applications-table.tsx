"use client";

import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { DataTable } from "@/components/table/data-table";
import {
  useAdminApplicationColumns,
  useClientApplicationColumns,
  useApplicationFilters,
} from "@/components/sections/shell/applications/columns";
import { ROUTES } from "@/lib/navigation/routes";
import type { ApplicationListItem } from "@/lib/applications/list-types";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ApplicationPaymentStatusChart } from "./applications-analytics";
import {
  DEFAULT_APPLICATION_COLUMNS,
  type ApplicationTableConfiguration,
} from "@/lib/applications/table-fields";
import {
  convertApplicationsToCSV,
  formatApplicationTableValue,
  getApplicationFieldSortValue,
  compareApplicationTableValues,
} from "@/lib/applications/table-values";
import { createSortableHeader } from "@/components/table/column-helpers";
import type { ColumnDef } from "@tanstack/react-table";

interface ApplicationsTableProps {
  applications: ApplicationListItem[];
  organizationSlug: string;
  isAdmin: boolean;
  emptyMessage?: string;
  analyticsApplications?: ApplicationListItem[];
  onFilteredApplicationsChange?: (applications: ApplicationListItem[]) => void;
  tableConfiguration?: ApplicationTableConfiguration;
  onColumnsChange?: (ids: string[]) => void;
}

type ArchiveRequest = {
  applications: ApplicationListItem[];
  isArchived: boolean;
  clearSelection?: () => void;
};

export function ApplicationsTable({
  applications,
  organizationSlug,
  isAdmin,
  emptyMessage,
  analyticsApplications = applications,
  onFilteredApplicationsChange,
  tableConfiguration,
  onColumnsChange,
}: ApplicationsTableProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Applications");
  const tTable = useTranslations("Common.table");
  const tActions = useTranslations("Common.actions");
  const tDetail = useTranslations("Applications.detail");
  const columnLabels = useMemo<Record<string, string>>(() => {
    const base = {
      _creationTime: t("date"),
      fullName: t("fullName"),
      program: t("program"),
      enrollmentYear: t("enrollmentYear"),
      contact: t("contact"),
      paymentProgress: t("payment"),
      status: t("status"),
    };
    return {
      ...base,
      ...Object.fromEntries(
        (tableConfiguration?.fields ?? []).map((field) => [
          field.id,
          Object.values(base).includes(field.label)
            ? `${field.label} — ${field.section}`
            : field.label,
        ]),
      ),
    };
  }, [t, tableConfiguration?.fields]);
  const columnGroups = tableConfiguration
    ? {
        ...Object.fromEntries(
          DEFAULT_APPLICATION_COLUMNS.map((id) => [
            id,
            tTable("generalColumns"),
          ]),
        ),
        ...Object.fromEntries(
          tableConfiguration.fields.map((field) => [field.id, field.section]),
        ),
      }
    : undefined;
  const paymentStatusHeader = useMemo(
    () =>
      isAdmin ? (
        <ApplicationPaymentStatusChart applications={analyticsApplications} />
      ) : undefined,
    [analyticsApplications, isAdmin],
  );
  const filters = useApplicationFilters(applications);
  const setArchived = useMutation(api.applications.setArchived);
  const [archiveRequest, setArchiveRequest] = useState<ArchiveRequest | null>(
    null,
  );
  const [isArchiving, setIsArchiving] = useState(false);

  const handleRowClick = (application: ApplicationListItem) => {
    router.push(
      ROUTES.org.applications.detail(organizationSlug, application._id),
    );
  };

  const handleCreate = () => {
    router.push(ROUTES.org.applications.create(organizationSlug));
  };

  const handleExport = isAdmin
    ? (rows: ApplicationListItem[], visibleColumnIds: string[]) => {
        const csv = convertApplicationsToCSV(rows, visibleColumnIds, {
          labels: columnLabels,
          locale,
          yes: tDetail("yes"),
          no: tDetail("no"),
          missing: tDetail("summaryNoInformation"),
          noFees: t("paymentNoFees"),
          statuses: {
            pending: t("statusOptions.pending"),
            reviewing: t("statusOptions.reviewing"),
            "pre-admitted": t("statusOptions.pre-admitted"),
            admitted: t("statusOptions.admitted"),
            denied: t("statusOptions.denied"),
          },
        });
        downloadCSV(
          csv,
          `applications-${organizationSlug}-${new Date().toISOString().split("T")[0]}.csv`,
        );
      }
    : undefined;

  const openArchiveDialog = useCallback(
    (
      selectedApplications: ApplicationListItem[],
      isArchived: boolean,
      clearSelection?: () => void,
    ) => {
      setArchiveRequest({
        applications: selectedApplications,
        isArchived,
        clearSelection,
      });
    },
    [],
  );

  const handleConfirmArchive = async () => {
    if (!archiveRequest) {
      return;
    }

    setIsArchiving(true);
    try {
      await Promise.all(
        archiveRequest.applications.map((application) =>
          setArchived({
            applicationId: application._id,
            isArchived: archiveRequest.isArchived,
          }),
        ),
      );
      archiveRequest.clearSelection?.();
      setArchiveRequest(null);
      toast.success(
        archiveRequest.isArchived
          ? t("archiveActions.archiveSuccess", {
              count: archiveRequest.applications.length,
            })
          : t("archiveActions.restoreSuccess", {
              count: archiveRequest.applications.length,
            }),
      );
    } catch (error) {
      console.error("[Applications] Failed to update archive state:", error);
      toast.error(t("archiveActions.error"));
    } finally {
      setIsArchiving(false);
    }
  };

  const adminColumns = useAdminApplicationColumns({
    paymentStatusHeader,
  });
  const clientColumns = useClientApplicationColumns();

  const columns = useMemo<ColumnDef<ApplicationListItem>[]>(() => {
    if (!isAdmin) return clientColumns;
    return [
      ...adminColumns,
      ...(tableConfiguration?.fields ?? []).map(
        (field): ColumnDef<ApplicationListItem> => ({
          id: field.id,
          header: createSortableHeader(columnLabels[field.id]),
          accessorFn: (row) => getApplicationFieldSortValue(row, field.id),
          sortUndefined: "last",
          sortingFn: (left, right, columnId) =>
            compareApplicationTableValues(
              left.getValue(columnId),
              right.getValue(columnId),
              locale,
            ),
          cell: ({ row }) => (
            <span className="block max-w-xs whitespace-normal break-words">
              {formatApplicationTableValue(
                row.original.formValues?.[field.id],
                {
                  yes: tDetail("yes"),
                  no: tDetail("no"),
                  missing: tDetail("summaryNoInformation"),
                },
              )}
            </span>
          ),
        }),
      ),
    ];
  }, [
    adminColumns,
    clientColumns,
    columnLabels,
    isAdmin,
    locale,
    tableConfiguration?.fields,
    tDetail,
  ]);
  const configurableColumnIds = [
    ...DEFAULT_APPLICATION_COLUMNS,
    ...(tableConfiguration?.fields ?? []).map((field) => field.id),
  ];
  const columnVisibility = tableConfiguration
    ? Object.fromEntries(
        [...configurableColumnIds, "sex"].map((id) => [
          id,
          tableConfiguration.visibleColumns.includes(id),
        ]),
      )
    : undefined;
  const selectedFieldIds =
    tableConfiguration?.visibleColumns.filter((id) => id.startsWith("form:")) ??
    [];
  const exportDisabled =
    tableConfiguration !== undefined &&
    (tableConfiguration.visibleColumns.length === 0 ||
      applications.some((row) =>
        selectedFieldIds.some((id) => row.formValues?.[id] === undefined),
      ));

  const resultsCountLabel = (
    filtered: number,
    total: number,
    isFiltered: boolean,
  ) => {
    if (isFiltered) {
      return t("table.filteredCount", { count: filtered, total });
    }
    return "";
  };

  const archiveDialogCount = archiveRequest?.applications.length ?? 0;
  const isBulkArchive = archiveDialogCount > 1;
  const isArchiveAction = archiveRequest?.isArchived === true;

  return (
    <>
      <DataTable
        data={applications}
        columns={columns}
        filterColumn="fullName"
        filterPlaceholder={t("searchPlaceholder")}
        emptyMessage={
          emptyMessage ??
          (isAdmin ? t("emptyMessageAdmin") : t("emptyMessageClient"))
        }
        columnsMenuLabel={tTable("columns")}
        columnLabels={columnLabels}
        columnGroups={columnGroups}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={
          onColumnsChange
            ? (visibility) =>
                onColumnsChange(
                  configurableColumnIds.filter(
                    (id) => visibility[id] !== false,
                  ),
                )
            : undefined
        }
        exportDisabled={exportDisabled}
        exportButtonLabel={tActions("export")}
        filtersMenuLabel={tTable("filters")}
        filterConfigs={isAdmin ? filters : undefined}
        initialSorting={[{ id: "_creationTime", desc: true }]}
        enableRowSelection={isAdmin}
        resultsCountLabel={resultsCountLabel}
        selectedRowsLabel={(selected, total) =>
          t("archiveActions.selectedRows", { selected, total })
        }
        renderBulkActions={
          isAdmin
            ? (selectedRows, clearSelection) => {
                const shouldRestore = selectedRows.some(
                  (row) => row.isArchived,
                );
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      openArchiveDialog(
                        selectedRows,
                        !shouldRestore,
                        clearSelection,
                      )
                    }
                  >
                    {shouldRestore ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    <span>
                      {shouldRestore
                        ? t("archiveActions.restoreSelected")
                        : t("archiveActions.archiveSelected")}
                    </span>
                  </Button>
                );
              }
            : undefined
        }
        onCreate={!isAdmin ? handleCreate : undefined}
        onExport={handleExport}
        onFilteredDataChange={
          isAdmin ? onFilteredApplicationsChange : undefined
        }
        onRowClick={handleRowClick}
      />

      <AlertDialog
        open={archiveRequest !== null}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveRequest(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              {isArchiveAction ? <Archive /> : <ArchiveRestore />}
            </AlertDialogMedia>
            <AlertDialogTitle>
              {isArchiveAction
                ? isBulkArchive
                  ? t("archiveActions.archiveManyTitle", {
                      count: archiveDialogCount,
                    })
                  : t("archiveActions.archiveOneTitle")
                : isBulkArchive
                  ? t("archiveActions.restoreManyTitle", {
                      count: archiveDialogCount,
                    })
                  : t("archiveActions.restoreOneTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArchiveAction
                ? isBulkArchive
                  ? t("archiveActions.archiveManyDescription")
                  : t("archiveActions.archiveOneDescription")
                : isBulkArchive
                  ? t("archiveActions.restoreManyDescription")
                  : t("archiveActions.restoreOneDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" disabled={isArchiving}>
              {tActions("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmArchive}
              disabled={isArchiving}
            >
              {isArchiveAction
                ? t("archiveActions.archiveConfirm")
                : t("archiveActions.restoreConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function downloadCSV(csv: string, filename: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
