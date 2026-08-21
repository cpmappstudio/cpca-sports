"use client";

import { useMemo, useState } from "react";
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
  Flame,
  Mail,
  MoreVertical,
  Plus,
  Trash2,
  UserRoundCog,
} from "lucide-react";
import { toast } from "sonner";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useRouter } from "@/i18n/navigation";
import { ROUTES } from "@/lib/navigation/routes";
import { getLocalDateInputValue } from "@/lib/coaches/local-date";
import { calculateWeeklyStreak } from "@/lib/coaches/weekly-streak";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabsNavigation } from "@/components/common/tabs-navigation";
import { DestructiveConfirmationDialog } from "@/components/common/destructive-confirmation-dialog";
import {
  EntityDetailBackButton,
  EntityDetailProfile,
} from "@/components/common/entity-detail-profile";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CoachDialog } from "./coach-dialog";
import { ActivityDialog } from "./activity-dialog";
import { ActivityHistoryItem } from "./activity-history-item";
import { ItemGroup } from "@/components/ui/item";
import { useTranslations } from "next-intl";

export function CoachDetailView({
  preloadedCoach,
  tenant,
  programs,
  organizationLogoUrl,
}: {
  preloadedCoach: Preloaded<typeof api.coaches.getById>;
  tenant: string;
  programs: Pick<Doc<"programs">, "_id" | "name">[];
  organizationLogoUrl?: string;
}) {
  const detail = usePreloadedQuery(preloadedCoach);
  const router = useRouter();
  const [coachDialog, setCoachDialog] = useState(false);
  const [activityDialog, setActivityDialog] = useState(false);
  const [editingActivityId, setEditingActivityId] =
    useState<Id<"coachActivities"> | null>(null);
  const [deleteCoachOpen, setDeleteCoachOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] =
    useState<Id<"coachActivities"> | null>(null);
  const [deleting, setDeleting] = useState(false);
  const activities = useQuery(
    api.coachActivities.listByCoach,
    detail ? { coachId: detail.coach._id } : "skip",
  );
  const summary = useMemo(
    () => ({
      activityCount: activities?.length ?? 0,
      weeklyStreak: calculateWeeklyStreak(
        activities
          ?.filter((activity) => activity.completed)
          .map((activity) => activity.activityDate) ?? [],
        getLocalDateInputValue(),
      ),
    }),
    [activities],
  );
  const places = useQuery(
    api.coachOptions.listPlacesForCoach,
    detail
      ? {
          coachId: detail.coach._id,
          activityId: editingActivityId ?? undefined,
        }
      : "skip",
  );
  const setArchived = useMutation(api.coaches.setArchived);
  const removeActivity = useMutation(api.coachActivities.remove);
  const t = useTranslations("Coaches.detail");
  if (!detail) return null;
  const editingActivity = activities?.find(
    (item) => item._id === editingActivityId,
  );
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
  const deleteActivity = async (activityId: Id<"coachActivities">) => {
    setDeleting(true);
    try {
      await removeActivity({ activityId });
      toast.success(t("activityDeleted"));
      setActivityToDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("activityDeleteError"),
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6">
            <section className="flex flex-col gap-4">
              <EntityDetailBackButton
                href={coachesListHref}
                label={t("backToList")}
              />
              <EntityDetailProfile
                logoUrl={organizationLogoUrl}
                header={
                  <div className="flex items-start gap-4">
                    {detail.user.imageUrl ? (
                      <Image
                        src={detail.user.imageUrl}
                        alt=""
                        width={80}
                        height={80}
                        unoptimized
                        className="size-20 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex size-20 shrink-0 items-center justify-center rounded-md bg-primary text-2xl font-semibold text-primary-foreground">
                        {detail.user.firstName[0]}
                        {detail.user.lastName[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h1 className="min-w-0 text-2xl font-semibold tracking-tight md:text-3xl">
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
                              <SelectItem value="active">
                                {t("active")}
                              </SelectItem>
                              <SelectItem value="inactive">
                                {t("inactive")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant={
                              detail.user.isActive ? "default" : "secondary"
                            }
                          >
                            {detail.user.isActive ? t("active") : t("inactive")}
                          </Badge>
                        )}
                        {detail.isAdmin ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setCoachDialog(true)}
                              >
                                <Edit />
                                {t("edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => void toggleArchive()}
                              >
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
                }
              >
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 shrink-0 text-primary" />
                    <span className="font-semibold text-foreground">
                      {t("email")}:
                    </span>
                    <span className="min-w-0 truncate text-muted-foreground">
                      {detail.user.email}
                    </span>
                  </div>
                  <hr />
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="size-4 shrink-0 text-primary" />
                    <span className="font-semibold text-foreground">
                      {t("program")}:
                    </span>
                    <span className="text-muted-foreground">
                      {detail.program.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserRoundCog className="size-4 shrink-0 text-primary" />
                    <span className="font-semibold text-foreground">
                      {t("position")}:
                    </span>
                    <span className="text-muted-foreground">
                      {detail.position.name}
                    </span>
                  </div>
                </div>
              </EntityDetailProfile>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="flex items-center gap-3">
                    <CalendarCheck className="size-5 text-primary" />
                    <div>
                      <p className="text-2xl font-semibold">
                        {summary.activityCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("activities")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3">
                    <Flame className="size-5 text-orange-500" />
                    <div>
                      <p className="text-2xl font-semibold">
                        {summary.weeklyStreak}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("weeklyStreak")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        </div>
        <div className="lg:col-span-3">
          <Tabs defaultValue="activities" className="w-full">
            <TabsNavigation
              items={[
                {
                  value: "activities",
                  label: t("activities"),
                  icon: CalendarCheck,
                },
              ]}
            />
            <TabsContent value="activities" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>{t("activityHistory")}</CardTitle>
                  {!detail.coach.isArchived ? (
                    <CardAction>
                      <Button
                        onClick={() => {
                          setEditingActivityId(null);
                          setActivityDialog(true);
                        }}
                      >
                        <Plus />
                        {t("register")}
                      </Button>
                    </CardAction>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  <ItemGroup className="gap-3">
                    {activities?.map((activity) => (
                      <ActivityHistoryItem
                        key={activity._id}
                        activity={activity}
                        onEdit={() => {
                          setEditingActivityId(activity._id);
                          setActivityDialog(true);
                        }}
                        onDelete={() => setActivityToDelete(activity._id)}
                      />
                    ))}
                  </ItemGroup>
                  {activities !== undefined && activities.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      {t("emptyActivities")}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <CoachDialog
        open={coachDialog}
        onOpenChange={setCoachDialog}
        tenant={tenant}
        programs={programs}
        coach={detail}
      />
      <ActivityDialog
        open={activityDialog}
        onOpenChange={setActivityDialog}
        coachId={detail.coach._id}
        places={places ?? []}
        activity={editingActivity}
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
      <DestructiveConfirmationDialog
        open={activityToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setActivityToDelete(null);
        }}
        title={t("deleteActivityTitle")}
        description={t("confirmDeleteActivity")}
        cancelLabel={t("cancel")}
        confirmLabel={t("deleteConfirm")}
        pending={deleting}
        onConfirm={async () => {
          if (activityToDelete) await deleteActivity(activityToDelete);
        }}
      />
    </>
  );
}
