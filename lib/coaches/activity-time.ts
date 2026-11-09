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
