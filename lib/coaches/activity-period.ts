import type {
  CoachActivityDateRange,
  CoachActivityPeriodPreset,
} from "./types";
import { coachActivityDateTime } from "@/convex/lib/coachActivityTime";

export function activityPresetRange(
  preset: Exclude<CoachActivityPeriodPreset, "all" | "custom">,
  now = Date.now(),
): CoachActivityDateRange {
  const start = new Date(
    `${coachActivityDateTime(now).activityDate}T00:00:00Z`,
  );
  let end: Date;
  if (preset === "thisWeek" || preset === "lastWeek") {
    const mondayOffset = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(
      start.getUTCDate() - mondayOffset - (preset === "lastWeek" ? 7 : 0),
    );
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
  } else {
    start.setUTCDate(1);
    if (preset === "lastMonth") start.setUTCMonth(start.getUTCMonth() - 1);
    end = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
    );
  }
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

export function formatActivityDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00Z`));
}
