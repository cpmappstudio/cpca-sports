import {
  COACH_ACTIVITY_TIME_ZONE,
  resolveActivityTimeInput,
} from "@/convex/lib/coachActivityTime";
import type { CoachActivityTimeAdjustment } from "./types";

export function activityTimeAdjustmentPreview(
  input: CoachActivityTimeAdjustment,
) {
  const checkInAt = resolveActivityTimeInput(
    input.checkIn,
    input.expectedCheckInAt,
  );
  const checkOutAt =
    input.checkOut && input.expectedCheckOutAt !== null
      ? resolveActivityTimeInput(input.checkOut, input.expectedCheckOutAt)
      : null;
  if (typeof checkInAt !== "number")
    return {
      changed: true,
      durationMs: null,
      error: checkInAt === "ambiguous" ? "ambiguousTime" : "invalidTime",
      errorField: "checkIn",
    } as const;
  if (checkOutAt !== null && typeof checkOutAt !== "number")
    return {
      changed: true,
      durationMs: null,
      error: checkOutAt === "ambiguous" ? "ambiguousTime" : "invalidTime",
      errorField: "checkOut",
    } as const;
  const changed =
    checkInAt !== input.expectedCheckInAt ||
    checkOutAt !== input.expectedCheckOutAt;
  const durationMs = checkOutAt === null ? null : checkOutAt - checkInAt;
  const result = { changed, durationMs };
  if (changed && durationMs !== null && durationMs < 0)
    return {
      ...result,
      error: "checkoutBeforeCheckin",
      errorField: "checkOut",
    } as const;
  const now = Date.now();
  if (changed && checkInAt > now)
    return { ...result, error: "futureTime", errorField: "checkIn" } as const;
  if (changed && checkOutAt !== null && checkOutAt > now)
    return { ...result, error: "futureTime", errorField: "checkOut" } as const;
  return { ...result, error: null, errorField: null } as const;
}

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
