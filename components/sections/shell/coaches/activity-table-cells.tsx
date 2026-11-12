"use client";

import { LogOut, PanelRightOpen } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { CoachActivityListItem } from "@/lib/coaches/types";
import {
  formatActivityTimestamp,
  formatActivityDuration,
} from "@/lib/coaches/activity-time";
import { Button } from "@/components/ui/button";

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
  durationMs,
}: {
  durationMs: number | null;
}) {
  const t = useTranslations("Coaches.detail");
  return (
    <span className="whitespace-nowrap tabular-nums">
      {formatActivityDuration(durationMs, t)}
    </span>
  );
}

export function ActivityCheckout({ onCheckout }: { onCheckout: () => void }) {
  const t = useTranslations("Coaches.detail");
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onCheckout}
      title={t("checkout")}
      className="min-h-11 min-w-11 w-full border-primary/40 text-primary shadow-none hover:bg-primary/5 hover:text-primary md:w-auto dark:border-primary/40 dark:hover:bg-primary/10"
    >
      <LogOut />
      <span className="sr-only md:not-sr-only">{t("checkout")}</span>
    </Button>
  );
}
