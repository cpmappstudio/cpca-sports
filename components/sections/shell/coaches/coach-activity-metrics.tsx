"use client";

import { CalendarCheck, Clock3 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FunctionReturnType } from "convex/server";
import type { CoachActivityPeriod } from "@/lib/coaches/types";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { formatActivityDuration } from "@/lib/coaches/activity-time";

export function CoachActivityMetrics({
  summary,
  inPeriod = false,
}: {
  summary:
    | FunctionReturnType<typeof api.coachActivities.getSummary>
    | Extract<CoachActivityPeriod, { status: "ready" }>["summary"]
    | undefined;
  inPeriod?: boolean;
}) {
  const t = useTranslations("Coaches.detail");
  const totalMinutes =
    summary === undefined
      ? undefined
      : "totalDurationMs" in summary
        ? Math.floor(summary.totalDurationMs / 60000)
        : summary.totalMinutes;
  const metrics = [
    {
      label: inPeriod ? "periodActivities" : "activities",
      Icon: CalendarCheck,
      value: summary?.activityCount ?? "—",
      color: "text-primary",
    },
    {
      label: inPeriod ? "periodActivityTime" : "totalActivityTime",
      Icon: Clock3,
      value:
        totalMinutes === undefined
          ? "—"
          : formatActivityDuration(totalMinutes * 60000, t, true),
      color: "text-primary",
    },
  ];
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3">
      {metrics.map(({ label, Icon, value, color }) => (
        <Card
          key={label}
          className="h-full min-w-0 justify-center gap-0 border-primary/20 bg-primary/[0.06] py-2 sm:py-4"
        >
          <CardContent className="flex flex-col items-start gap-2 px-2 sm:min-h-16 sm:flex-row sm:items-center sm:px-3">
            <div
              className={`flex size-4.5 shrink-0 items-center justify-center sm:size-9 ${color}`}
            >
              <Icon aria-hidden="true" className="size-4.5 sm:size-9" />
            </div>
            <div className="w-full min-w-0 sm:w-auto">
              <p className="min-h-8 text-[11px] leading-4 text-muted-foreground sm:min-h-0 sm:text-xs">
                {t(label)}
              </p>
              <p className="break-words text-sm leading-5 font-semibold tabular-nums sm:whitespace-nowrap sm:text-xl sm:leading-7">
                {value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
