"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import type { SortingState } from "@tanstack/react-table";
import type {
  CoachActivitySort,
  CoachActivityPeriod,
  CoachActivityPeriodSelection,
} from "@/lib/coaches/types";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { COACH_ACTIVITY_TIME_ZONE } from "@/convex/lib/coachActivityTime";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DestructiveConfirmationDialog } from "@/components/common/destructive-confirmation-dialog";
import { ActivityDialog, type ActivityAction } from "./activity-dialog";
import { ActivityHistoryItem } from "./activity-history-item";
import { ActivityPeriodFilter } from "./activity-period-filter";
import { ActivityPeriodNotice } from "./activity-period-notice";
import { CoachActivitiesTable } from "./coach-activities-table";

type ActivityTab = "open" | "history";

export function CoachActivities({
  coachId,
  isArchived,
  periodSelection,
  onPeriodChange,
  periodResult,
}: {
  coachId: Id<"coaches">;
  isArchived: boolean;
  periodSelection: CoachActivityPeriodSelection;
  onPeriodChange: (selection: CoachActivityPeriodSelection) => void;
  periodResult?: CoachActivityPeriod;
}) {
  const t = useTranslations("Coaches.detail");
  const range = periodSelection.range;
  const period = periodResult?.status === "ready" ? periodResult : undefined;
  const heading = useRef<HTMLHeadingElement>(null);
  const detailOpener = useRef<HTMLElement | null>(null);
  const [tab, setTab] = useState<ActivityTab | null>(null);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const cursor = cursors[cursors.length - 1];
  const [sortingByTab, setSortingByTab] = useState<
    Record<ActivityTab, SortingState>
  >({
    open: [{ id: "checkIn", desc: true }],
    history: [{ id: "checkIn", desc: true }],
  });
  const querySort = (value: SortingState): CoachActivitySort => ({
    field: value[0].id as CoachActivitySort["field"],
    direction: value[0].desc ? "desc" : "asc",
  });
  const [selectedId, setSelectedId] = useState<Id<"coachActivities"> | null>(
    null,
  );
  const [dialog, setDialog] = useState<{
    action: ActivityAction;
    activityId?: Id<"coachActivities">;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"coachActivities"> | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const open = useQuery(
    api.coachActivities.listOpenByCoach,
    range || tab === "history"
      ? "skip"
      : {
          coachId,
          sort: querySort(sortingByTab.open),
          paginationOpts: {
            numItems: 10,
            cursor: tab === "open" ? cursor : null,
          },
        },
  );
  const activeTab =
    tab ??
    (range
      ? !period || period.summary.pendingCount > 0
        ? "open"
        : "history"
      : open === undefined || open.page.length
        ? "open"
        : "history");
  const history = useQuery(
    api.coachActivities.listHistoryByCoach,
    !range && activeTab === "history"
      ? {
          coachId,
          sort: querySort(sortingByTab.history),
          paginationOpts: { numItems: 10, cursor },
        }
      : "skip",
  );
  const page = activeTab === "open" ? open : history;
  const periodActivities = useMemo(
    () =>
      period?.activities.filter((activity) =>
        activeTab === "open"
          ? activity.status === "in_progress"
          : activity.status !== "in_progress",
      ) ?? [],
    [period?.activities, activeTab],
  );
  if (!range && page && page.page.length === 0 && cursors.length > 1) {
    setCursors(cursors.slice(0, -1));
  }
  const selected = useQuery(
    api.coachActivities.getById,
    selectedId ? { activityId: selectedId } : "skip",
  );
  const remove = useMutation(api.coachActivities.remove);

  const switchTab = (value: string) => {
    setTab(value as ActivityTab);
    setCursors([null]);
  };
  const changePeriod = (selection: CoachActivityPeriodSelection) => {
    setTab(activeTab);
    setCursors([null]);
    onPeriodChange(selection);
  };
  const changeSorting = useCallback(
    (sorting: SortingState) => {
      setTab(activeTab);
      setSortingByTab((current) => ({ ...current, [activeTab]: sorting }));
      setCursors([null]);
    },
    [activeTab],
  );
  const changePage = (next: (string | null)[]) => {
    setTab(activeTab);
    setCursors(next);
    heading.current?.focus();
    heading.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  };
  const view = useCallback((activityId: Id<"coachActivities">) => {
    detailOpener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setSelectedId(activityId);
  }, []);
  const edit = useCallback((activityId: Id<"coachActivities">) => {
    setSelectedId(null);
    setDialog({ action: "edit", activityId });
  }, []);
  const checkout = useCallback((activityId: Id<"coachActivities">) => {
    setSelectedId(null);
    setDialog({ action: "checkOut", activityId });
  }, []);
  const askDelete = useCallback((activityId: Id<"coachActivities">) => {
    setSelectedId(null);
    setDeletingId(activityId);
  }, []);
  const deleteActivity = async () => {
    if (!deletingId || deleting) return;
    setDeleting(true);
    try {
      await remove({ activityId: deletingId });
      setDeletingId(null);
      setCursors([null]);
      toast.success(t("activityDeleted"));
    } catch {
      toast.error(t("activityDeleteError"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section
      className="min-w-0 space-y-5 rounded-xl bg-card px-3 py-4 text-card-foreground sm:px-5 sm:py-5"
      aria-labelledby="coach-activities-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="coach-activities-heading"
            ref={heading}
            tabIndex={-1}
            className="scroll-mt-6 text-xl font-semibold outline-none"
          >
            {t("activities")}
          </h2>
        </div>
        {!isArchived ? (
          <Button
            type="button"
            onClick={() => setDialog({ action: "checkIn" })}
            className="min-h-11"
          >
            <Plus />
            {t("checkin")}
          </Button>
        ) : null}
      </div>
      {isArchived ? (
        <p className="text-sm text-muted-foreground">
          {t("archivedActivities")}
        </p>
      ) : null}
      <ActivityPeriodFilter
        selection={periodSelection}
        onChange={changePeriod}
      />
      {range ? <ActivityPeriodNotice result={periodResult} /> : null}
      <Tabs value={activeTab} onValueChange={switchTab}>
        <TabsList aria-label={t("activities")} className="mb-0 justify-start">
          <TabsTrigger value="open" className="min-h-11">
            {t("openActivities")}
          </TabsTrigger>
          <TabsTrigger value="history" className="min-h-11">
            {t("activityHistory")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          {periodResult?.status !== "limitExceeded" || !range ? (
            <CoachActivitiesTable
              key={`${range?.from ?? "all"}:${range?.to ?? ""}:${activeTab}`}
              data={range ? periodActivities : (page?.page ?? [])}
              isLoading={
                range ? periodResult === undefined : page === undefined
              }
              completed={activeTab === "history"}
              emptyMessage={
                range
                  ? t(
                      activeTab === "history"
                        ? "emptyPeriodHistory"
                        : "emptyPeriodOpenActivities",
                    )
                  : undefined
              }
              sorting={sortingByTab[activeTab]}
              onSortingChange={changeSorting}
              pagination={
                range
                  ? undefined
                  : {
                      pageLabel: t("pageNumber", { page: cursors.length }),
                      navigationLabel: t("pagination"),
                      canPreviousPage: cursors.length > 1,
                      canNextPage: !!page && !page.isDone,
                      onPreviousPage: () => changePage(cursors.slice(0, -1)),
                      onNextPage: () =>
                        page && changePage([...cursors, page.continueCursor]),
                    }
              }
              onView={view}
              onEdit={edit}
              onDelete={askDelete}
              onCheckout={checkout}
            />
          ) : null}
        </TabsContent>
      </Tabs>
      <Sheet
        open={selectedId !== null}
        onOpenChange={(value) => {
          if (!value) setSelectedId(null);
        }}
      >
        <SheetContent
          className="w-full overflow-y-auto sm:max-w-xl"
          onCloseAutoFocus={(event) => {
            if (!dialog && !deletingId && detailOpener.current?.isConnected) {
              event.preventDefault();
              detailOpener.current.focus();
            }
          }}
        >
          <SheetHeader className="border-b px-6 py-5 pr-12">
            <SheetTitle>{t("activityDetails")}</SheetTitle>
            <SheetDescription>
              {t("timeZoneNotice", { timeZone: COACH_ACTIVITY_TIME_ZONE })}
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 pb-6">
            {selected === undefined ? (
              <p role="status">{t("loadingActivities")}</p>
            ) : selected === null ? (
              <p role="status">{t("activityUnavailable")}</p>
            ) : (
              <ActivityHistoryItem
                activity={selected}
                onEdit={() => edit(selected._id)}
                onDelete={() => askDelete(selected._id)}
                onCheckout={() => checkout(selected._id)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
      {dialog ? (
        <ActivityDialog
          open
          coachId={coachId}
          action={dialog.action}
          activityId={dialog.activityId}
          onOpenChange={(value) => {
            if (!value) setDialog(null);
          }}
        />
      ) : null}
      <DestructiveConfirmationDialog
        open={deletingId !== null}
        onOpenChange={(value) => {
          if (!value && !deleting) setDeletingId(null);
        }}
        title={t("deleteActivityTitle")}
        description={t("confirmDeleteActivity")}
        cancelLabel={t("cancel")}
        confirmLabel={t("deleteConfirm")}
        pending={deleting}
        onConfirm={deleteActivity}
      />
    </section>
  );
}
