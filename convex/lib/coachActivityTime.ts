export const COACH_ACTIVITY_TIME_ZONE = "America/New_York";

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: COACH_ACTIVITY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function poincianaClock(timestamp: number) {
  const parts = formatter.formatToParts(timestamp);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}`;
}

export function coachActivityDateTime(timestamp: number) {
  const [activityDate, time] = poincianaClock(timestamp).split("T");
  return { activityDate, time: time.slice(0, 5) };
}

function clockMilliseconds(value: string | undefined) {
  const match = value?.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  return match
    ? (Number(match[1]) * 3600 +
        Number(match[2]) * 60 +
        Number(match[3] ?? 0)) *
        1000
    : null;
}

export function legacyActivityTimestamp(
  date: string,
  time: string | undefined,
): number | null {
  return activityTimeCandidates(date, time)[0]?.timestamp ?? null;
}

export function activityTimeCandidates(date: string, time: string | undefined) {
  if (
    !time ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    clockMilliseconds(time) === null
  )
    return [];
  const localClock = `${date}T${time.length === 5 ? `${time}:00` : time}`;
  const wallTime = Date.parse(`${localClock}Z`);
  if (
    !Number.isFinite(wallTime) ||
    new Date(wallTime).toISOString().slice(0, 19) !== localClock
  )
    return [];
  const dayMs = 86400000;
  const candidates = new Map<number, number>();
  // Sample both sides of an offset change and verify the local clock.
  for (const sample of [wallTime - dayMs, wallTime + dayMs]) {
    const offset = Date.parse(`${poincianaClock(sample)}Z`) - sample;
    const candidate = wallTime - offset;
    if (poincianaClock(candidate) === localClock) {
      candidates.set(candidate, offset / 60000);
    }
  }
  return [...candidates]
    .sort(([a], [b]) => a - b)
    .map(([timestamp, offsetMinutes]) => ({ timestamp, offsetMinutes }));
}

export function activityLocalDateTime(timestamp: number) {
  const { activityDate, time } = coachActivityDateTime(timestamp);
  return `${activityDate}T${time}`;
}

export function resolveActivityTimeInput(
  input: { dateTime: string; offsetMinutes?: number },
  original: number | undefined,
): number | "invalid" | "ambiguous" {
  if (
    original !== undefined &&
    input.dateTime === activityLocalDateTime(original) &&
    input.offsetMinutes === undefined
  )
    return original;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.dateTime)) return "invalid";
  const [date, time] = input.dateTime.split("T");
  const candidates = activityTimeCandidates(date, time).filter(
    (candidate) =>
      input.offsetMinutes === undefined ||
      candidate.offsetMinutes === input.offsetMinutes,
  );
  if (!candidates.length) return "invalid";
  return candidates.length > 1 ? "ambiguous" : candidates[0].timestamp;
}

export function coachActivityDurationMs(activity: {
  completed: boolean;
  status?: "in_progress" | "completed";
  checkInAt?: number;
  checkOutAt?: number;
  startTime: string;
  endTime?: string;
}): number | null {
  if (!activity.completed || activity.status === "in_progress") return null;
  if (activity.checkInAt !== undefined || activity.checkOutAt !== undefined) {
    if (activity.checkInAt === undefined || activity.checkOutAt === undefined)
      return null;
    const duration = activity.checkOutAt - activity.checkInAt;
    return Number.isFinite(duration) && duration >= 0 ? duration : null;
  }
  const start = clockMilliseconds(activity.startTime);
  const end = clockMilliseconds(activity.endTime);
  // Earlier records have a single date; do not infer an overnight duration.
  return start !== null && end !== null && end >= start ? end - start : null;
}

export function isActivityDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
