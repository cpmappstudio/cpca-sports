import { COACH_ACTIVITY_TIME_ZONE } from "@/convex/lib/coachActivityTime";

export function formatActivityTimestamp(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: COACH_ACTIVITY_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(timestamp);
}

export function formatActivityDuration(
  durationMs: number | null,
  t: (
    key: "durationUnavailable" | "lessThanMinute" | "durationValue",
    values?: Record<string, number>,
  ) => string,
  total = false,
) {
  if (durationMs === null) return t("durationUnavailable");
  if (!total && durationMs < 60000) return t("lessThanMinute");
  return t("durationValue", {
    hours: Math.floor(durationMs / 3600000),
    minutes: Math.floor(durationMs / 60000) % 60,
  });
}
