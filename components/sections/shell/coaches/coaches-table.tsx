"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { DataTable } from "@/components/table/data-table";
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
import { ROUTES } from "@/lib/navigation/routes";
import type { CoachListItem } from "@/lib/coaches/types";
import { useCoachColumns, useCoachFilters } from "./coach-columns";
import { CoachDialog } from "./coach-dialog";
import { useTranslations } from "next-intl";

type ArchiveRequest = {
  coaches: CoachListItem[];
  isArchived: boolean;
  clearSelection: () => void;
};

export function CoachesTable({
  coaches,
  tenant,
  programs,
  emptyMessage,
}: {
  coaches: CoachListItem[];
  tenant: string;
  programs: Pick<Doc<"programs">, "_id" | "name">[];
  emptyMessage: string;
}) {
  const router = useRouter();
  const columns = useCoachColumns();
  const filters = useCoachFilters(coaches);
  const setArchived = useMutation(api.coaches.setArchived);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiveRequest, setArchiveRequest] = useState<ArchiveRequest | null>(
    null,
  );
  const [archiving, setArchiving] = useState(false);
  const t = useTranslations("Coaches.table");
  const count = useMemo(
    () => (filtered: number, total: number, active: boolean) =>
      active ? t("count", { filtered, total }) : "",
    [t],
  );

  const confirmArchive = async () => {
    if (!archiveRequest) return;
    setArchiving(true);
    try {
      await Promise.all(
        archiveRequest.coaches.map((coach) =>
          setArchived({
            coachId: coach._id,
            isArchived: archiveRequest.isArchived,
          }),
        ),
      );
      archiveRequest.clearSelection();
      toast.success(
        t("archiveSuccess", { count: archiveRequest.coaches.length }),
      );
      setArchiveRequest(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("archiveError"));
    } finally {
      setArchiving(false);
    }
  };

  return (
    <>
      <DataTable
        data={coaches}
        columns={columns}
        filterColumn="fullName"
        filterPlaceholder={t("search")}
        emptyMessage={emptyMessage}
        filterConfigs={filters}
        filtersMenuLabel={t("filters")}
        columnsMenuLabel={t("columns")}
        initialSorting={[{ id: "fullName", desc: false }]}
        resultsCountLabel={count}
        enableRowSelection
        selectedRowsLabel={(selected, total) =>
          t("selectedRows", { selected, total })
        }
        renderBulkActions={(selectedRows, clearSelection) => {
          const shouldRestore = selectedRows.some((coach) => coach.isArchived);
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setArchiveRequest({
                  coaches: selectedRows,
                  isArchived: !shouldRestore,
                  clearSelection,
                })
              }
            >
              {shouldRestore ? <ArchiveRestore /> : <Archive />}
              {shouldRestore ? t("restoreSelected") : t("archiveSelected")}
            </Button>
          );
        }}
        onCreate={() => setDialogOpen(true)}
        onRowClick={(coach) =>
          router.push(ROUTES.org.coaches.detail(tenant, coach._id))
        }
      />
      <CoachDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenant={tenant}
        programs={programs}
        onSaved={(coachId) =>
          router.push(ROUTES.org.coaches.detail(tenant, coachId))
        }
      />
      <AlertDialog
        open={archiveRequest !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveRequest(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              {archiveRequest?.isArchived ? <Archive /> : <ArchiveRestore />}
            </AlertDialogMedia>
            <AlertDialogTitle>
              {archiveRequest?.isArchived
                ? t("archiveTitle")
                : t("restoreTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archiveRequest?.isArchived
                ? t("archiveDescription")
                : t("restoreDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive} disabled={archiving}>
              {archiveRequest?.isArchived
                ? t("archiveConfirm")
                : t("restoreConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
