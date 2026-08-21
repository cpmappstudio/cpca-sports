"use client";

import Image from "next/image";
import { Edit, MapPin, MoreVertical, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CoachActivity } from "@/lib/coaches/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

function ActivityImagePreview({ activity }: { activity: CoachActivity }) {
  const t = useTranslations("Coaches.detail");
  if (!activity.imageUrl) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t("previewImage", { title: activity.title })}
        >
          <ItemMedia variant="image" className="self-center translate-y-0">
            <Image
              src={activity.imageUrl}
              alt=""
              width={40}
              height={40}
              unoptimized
              className="object-cover"
            />
          </ItemMedia>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl overflow-hidden bg-black/95 p-2 text-white">
        <DialogHeader className="sr-only">
          <DialogTitle>{activity.title}</DialogTitle>
          <DialogDescription>
            {t("previewImage", { title: activity.title })}
          </DialogDescription>
        </DialogHeader>
        <div className="relative h-[75vh] min-h-64 w-full">
          <Image
            src={activity.imageUrl}
            alt={activity.title}
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
}: {
  activity: CoachActivity;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("Coaches.detail");

  return (
    <Item
      variant="outline"
      role="listitem"
      className={`flex-nowrap p-3 ${
        activity.completed
          ? "border-green-500/20 bg-green-500/10"
          : "border-orange-500/20 bg-orange-500/10"
      }`}
    >
      <ActivityImagePreview activity={activity} />
      <ItemContent className="min-w-0">
        <ItemTitle className="line-clamp-1">{activity.title}</ItemTitle>
        <ItemDescription className="line-clamp-1">
          <span className="sr-only">
            {activity.completed ? t("completed") : t("notCompleted")}.
          </span>
          {activity.activityDate} · {activity.startTime}–{activity.endTime}
        </ItemDescription>
        <ItemDescription className="flex items-center gap-1">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{activity.placeName}</span>
        </ItemDescription>
        {activity.description ? (
          <ItemDescription className="line-clamp-2">
            {activity.description}
          </ItemDescription>
        ) : null}
      </ItemContent>
      <ItemActions className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreVertical className="size-4" />
              <span className="sr-only">{t("activityActions")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit />
              {t("editActivity")}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 />
              {t("deleteActivity")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>
    </Item>
  );
}
