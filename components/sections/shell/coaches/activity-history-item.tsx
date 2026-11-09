"use client";

import Image from "next/image";
import { LogOut, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { CoachActivity } from "@/lib/coaches/types";
import { formatActivityTimestamp } from "@/lib/coaches/activity-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActivityActions } from "./activity-actions";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemHeader,
  ItemFooter,
  ItemTitle,
} from "@/components/ui/item";

function ActivityPhoto({
  url,
  label,
  title,
}: {
  url: string | null;
  label: string;
  title: string;
}) {
  if (!url) return null;
  return (
    <Dialog>
      <div className="space-y-1">
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={`${label}: ${title}`}
            className="block overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Image
              src={url}
              alt=""
              width={80}
              height={60}
              unoptimized
              className="h-16 w-20 object-cover"
            />
          </button>
        </DialogTrigger>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <DialogContent className="sm:max-w-4xl overflow-hidden bg-black/95 p-2 text-white">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        <div className="relative h-[75dvh] min-h-64 w-full">
          <Image
            src={url}
            alt={`${label}: ${title}`}
            fill
            sizes="min(100vw - 2rem, 896px)"
            unoptimized
            className="object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ActivityHistoryItem({
  activity,
  onEdit,
  onDelete,
  onCheckout,
}: {
  activity: CoachActivity;
  onEdit: () => void;
  onDelete: () => void;
  onCheckout?: () => void;
}) {
  const t = useTranslations("Coaches.detail");
  const locale = useLocale();
  const isOpen = activity.status === "in_progress";
  const isNew = activity.checkInAt !== undefined;
  const state = isOpen
    ? "inProgress"
    : isNew
      ? "finished"
      : activity.completed
        ? "completed"
        : "notCompleted";
  return (
    <Item className="flex-col items-stretch gap-4 p-0">
      <ItemHeader className="items-start">
        <div className="min-w-0 space-y-2">
          <ItemTitle className="w-auto break-words text-base font-semibold">
            {activity.title}
          </ItemTitle>
          <Badge
            variant="secondary"
            className={
              isOpen
                ? "border-primary/15 bg-primary/10 text-primary"
                : undefined
            }
          >
            {t(state)}
          </Badge>
        </div>
        <ItemActions className="shrink-0">
          <ActivityActions onEdit={onEdit} onDelete={onDelete} />
        </ItemActions>
      </ItemHeader>
      <ItemContent className="w-full min-w-0 flex-none gap-3">
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <span className="break-words">{activity.placeName}</span>
        </p>
        {activity.checkInAt !== undefined ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs text-muted-foreground">{t("entry")}</dt>
              <dd>
                <time dateTime={new Date(activity.checkInAt).toISOString()}>
                  {formatActivityTimestamp(activity.checkInAt, locale)}
                </time>
              </dd>
            </div>
            {activity.checkOutAt !== undefined ? (
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">{t("exit")}</dt>
                <dd>
                  <time dateTime={new Date(activity.checkOutAt).toISOString()}>
                    {formatActivityTimestamp(activity.checkOutAt, locale)}
                  </time>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              {activity.activityDate} · {activity.startTime}–{activity.endTime}
            </p>
            <p>{t("legacyRecord")}</p>
          </div>
        )}
        {activity.description ? (
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {activity.description}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <ActivityPhoto
            url={activity.imageUrl}
            title={activity.title}
            label={isNew ? t("entryPhoto") : t("legacyPhoto")}
          />
          {isNew ? (
            <ActivityPhoto
              url={activity.checkOutImageUrl}
              title={activity.title}
              label={t("exitPhoto")}
            />
          ) : null}
        </div>
      </ItemContent>
      {isOpen && onCheckout ? (
        <ItemFooter className="pt-1">
          <Button
            type="button"
            onClick={onCheckout}
            className="min-h-11 w-full sm:w-auto sm:px-6"
          >
            <LogOut />
            {t("checkout")}
          </Button>
        </ItemFooter>
      ) : null}
    </Item>
  );
}
