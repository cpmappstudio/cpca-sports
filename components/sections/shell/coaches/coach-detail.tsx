"use client";

import { useState } from "react";
import Image from "next/image";
import {
  useMutation,
  usePreloadedQuery,
  useQuery,
  type Preloaded,
} from "convex/react";
import {
  Archive,
  ArchiveRestore,
  CalendarCheck,
  Edit,
  Mail,
  MoreVertical,
  Trash2,
  UserRoundCog,
} from "lucide-react";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useRouter } from "@/i18n/navigation";
import { ROUTES } from "@/lib/navigation/routes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DestructiveConfirmationDialog } from "@/components/common/destructive-confirmation-dialog";
import { EntityDetailBackButton } from "@/components/common/entity-detail-profile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CoachDialog } from "./coach-dialog";
import { CoachActivities } from "./coach-activities";
import type { CoachActivityPeriodSelection } from "@/lib/coaches/types";
import { CoachActivityMetrics } from "./coach-activity-metrics";
import { ActivityReport } from "./activity-report";
import { useTranslations } from "next-intl";

export function CoachDetailView({
  preloadedCoach,
  tenant,
  programs,
}: {
  preloadedCoach: Preloaded<typeof api.coaches.getById>;
  tenant: string;
  programs: Pick<Doc<"programs">, "_id" | "name">[];
}) {
  const detail = usePreloadedQuery(preloadedCoach);
  const router = useRouter();
  const [coachDialog, setCoachDialog] = useState(false);
  const [deleteCoachOpen, setDeleteCoachOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [periodSelection, setPeriodSelection] =
    useState<CoachActivityPeriodSelection>({ preset: "all", range: null });
  const periodResult = useQuery(
    api.coachActivities.getPeriodByCoach,
    detail && periodSelection.range
      ? { coachId: detail.coach._id, range: periodSelection.range }
      : "skip",
  );
  const lifetimeSummary = useQuery(
    api.coachActivities.getSummary,
    detail && !periodSelection.range ? { coachId: detail.coach._id } : "skip",
  );
  const summary = periodSelection.range
    ? periodResult?.status === "ready"
      ? periodResult.summary
      : undefined
    : lifetimeSummary;
  const setArchived = useMutation(api.coaches.setArchived);
  const t = useTranslations("Coaches.detail");
  if (!detail) return null;
  const coachesListHref = `${ROUTES.org.coaches.list(tenant)}?tab=${
    detail.coach.isArchived ? "archived" : "active"
  }`;

  const toggleArchive = async () => {
    try {
      await setArchived({
        coachId: detail.coach._id,
        isArchived: !detail.coach.isArchived,
      });
      toast.success(
        detail.coach.isArchived ? t("restoredSuccess") : t("archivedSuccess"),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("updateError"));
    }
  };
  const deleteCoach = async () => {
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/organizations/${tenant}/coaches/${detail.coach._id}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || t("deleteError"));
      router.replace(ROUTES.org.coaches.list(tenant));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("deleteError"));
      setDeleting(false);
    }
  };
  const updateStatus = async (value: string) => {
    try {
      const form = new FormData();
      form.set("intent", "status");
      form.set("isActive", String(value === "active"));
      const response = await fetch(
        `/api/organizations/${tenant}/coaches/${detail.coach._id}`,
        { method: "PATCH", body: form },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || t("updateError"));
      toast.success(t("statusUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("updateError"));
    }
  };

  return (
    <>
      <div className="space-y-6">
        <EntityDetailBackButton
          href={coachesListHref}
          label={t("backToList")}
        />
        <header className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] xl:items-center">
          <div className="min-w-0 space-y-3">
            <div className="flex items-start gap-4">
              {detail.user.imageUrl ? (
                <Image
                  src={detail.user.imageUrl}
                  alt=""
                  width={56}
                  height={56}
                  unoptimized
                  className="size-14 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-primary text-2xl font-semibold text-primary-foreground">
                  {detail.user.firstName[0]}
                  {detail.user.lastName[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h1 className="min-w-0 break-words text-xl font-semibold tracking-tight md:text-2xl">
                    {detail.user.firstName} {detail.user.lastName}
                  </h1>
                  {detail.coach.isArchived ? (
                    <Badge variant="outline" className="shrink-0">
                      {t("archived")}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {detail.isAdmin ? (
                    <Select
                      value={detail.user.isActive ? "active" : "inactive"}
                      onValueChange={(value) => void updateStatus(value)}
                    >
                      <SelectTrigger size="sm" className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t("active")}</SelectItem>
                        <SelectItem value="inactive">
                          {t("inactive")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      variant={detail.user.isActive ? "default" : "secondary"}
                    >
                      {detail.user.isActive ? t("active") : t("inactive")}
                    </Badge>
                  )}
                  {detail.isAdmin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <MoreVertical className="size-4" />
                          <span className="sr-only">{t("coachActions")}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setCoachDialog(true)}>
                          <Edit />
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void toggleArchive()}>
                          {detail.coach.isArchived ? (
                            <ArchiveRestore />
                          ) : (
                            <Archive />
                          )}
                          {detail.coach.isArchived
                            ? t("restore")
                            : t("archive")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteCoachOpen(true)}
                        >
                          <Trash2 />
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-start gap-2">
                <dt className="flex shrink-0 items-center gap-2 font-medium">
                  <Mail aria-hidden="true" className="size-4 text-primary" />
                  {t("email")}:
                </dt>
                <dd className="min-w-0 text-muted-foreground [overflow-wrap:anywhere]">
                  {detail.user.email}
                </dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="flex shrink-0 items-center gap-2 font-medium">
                  <UserRoundCog
                    aria-hidden="true"
                    className="size-4 text-primary"
                  />
                  {t("position")}:
                </dt>
                <dd className="min-w-0 break-words text-muted-foreground">
                  {detail.position.name}
                </dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="flex shrink-0 items-center gap-2 font-medium">
                  <CalendarCheck
                    aria-hidden="true"
                    className="size-4 text-primary"
                  />
                  {t("program")}:
                </dt>
                <dd className="min-w-0 break-words text-muted-foreground">
                  {detail.program.name}
                </dd>
              </div>
            </dl>
          </div>
          <CoachActivityMetrics
            summary={summary}
            inPeriod={periodSelection.range !== null}
          />
        </header>
        <CoachActivities
          key={detail.coach._id}
          coachId={detail.coach._id}
          isArchived={detail.coach.isArchived}
          periodSelection={periodSelection}
          onPeriodChange={setPeriodSelection}
          periodResult={periodResult}
          reportAction={
            <ActivityReport
              coach={{
                name: `${detail.user.firstName} ${detail.user.lastName}`.trim(),
                program: detail.program.name,
                position: detail.position.name,
              }}
              range={periodSelection.range}
              period={periodResult}
            />
          }
        />
      </div>
      <CoachDialog
        open={coachDialog}
        onOpenChange={setCoachDialog}
        tenant={tenant}
        programs={programs}
        coach={detail}
      />
      <DestructiveConfirmationDialog
        open={deleteCoachOpen}
        onOpenChange={setDeleteCoachOpen}
        title={t("deleteCoachTitle")}
        description={t("confirmDeleteCoach")}
        cancelLabel={t("cancel")}
        confirmLabel={t("deleteConfirm")}
        pending={deleting}
        onConfirm={deleteCoach}
      />
    </>
  );
}
