"use client";

import { PanelRightOpen } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { CoachActivityListItem } from "@/lib/coaches/types";
import { isAwaitingActivityReconciliation } from "@/convex/lib/coachActivityClosure";
import {
  formatActivityTimestamp,
  formatActivityDuration,
} from "@/lib/coaches/activity-time";

export function ActivityName({
  activity,
}: {
  activity: CoachActivityListItem;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 font-semibold text-primary underline-offset-4 group-hover:underline">
      <span className="line-clamp-2 min-w-0 break-words">{activity.title}</span>
      <PanelRightOpen
        aria-hidden="true"
        className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      />
    </span>
  );
}

export function ActivityTime({
  activity,
  kind,
}: {
  activity: CoachActivityListItem;
  kind: "entry" | "exit";
}) {
  const t = useTranslations("Coaches.detail");
  const locale = useLocale();
  const timestamp = kind === "entry" ? activity.checkInAt : activity.checkOutAt;
  if (kind === "exit" && isAwaitingActivityReconciliation(activity))
    return (
      <span className="text-sm text-muted-foreground">
        {t("pendingReconciliation")}
      </span>
    );
  if (timestamp !== undefined) {
    return (
      <time dateTime={new Date(timestamp).toISOString()}>
        {formatActivityTimestamp(timestamp, locale)}
      </time>
    );
  }
  const originalTime = kind === "entry" ? activity.startTime : activity.endTime;
  if (activity.checkInAt !== undefined || !originalTime) return <>—</>;
  return (
    <>
      <p>
        {activity.activityDate} · {originalTime}
      </p>
      {kind === "entry" ? (
        <p className="text-xs text-muted-foreground">{t("legacyRecord")}</p>
      ) : null}
    </>
  );
}

export function ActivityDuration({
  activity,
}: {
  activity: CoachActivityListItem;
}) {
  const t = useTranslations("Coaches.detail");
  return (
    <span className="whitespace-nowrap tabular-nums">
      {isAwaitingActivityReconciliation(activity)
        ? t("durationUndetermined")
        : formatActivityDuration(activity.durationMs, t)}
    </span>
  );
}
