import { expect, test } from "vitest";
import { activityPresetRange, formatActivityDate } from "./activity-period";
import { isActivityDate } from "@/convex/lib/coachActivityTime";

test.each([
  ["2026-11-09T04:59:00Z", "2026-11-02", "2026-11-08"],
  ["2026-11-09T05:00:00Z", "2026-11-09", "2026-11-15"],
  ["2026-03-08T12:00:00Z", "2026-03-02", "2026-03-08"],
  ["2026-11-01T12:00:00Z", "2026-10-26", "2026-11-01"],
])("Monday–Sunday presets use Poinciana's calendar at %s", (now, from, to) => {
  expect(activityPresetRange("thisWeek", Date.parse(now))).toEqual({
    from,
    to,
  });
});

test("previous week and month cross year and leap-year boundaries", () => {
  expect(
    activityPresetRange("lastWeek", Date.parse("2026-01-05T17:00Z")),
  ).toEqual({ from: "2025-12-29", to: "2026-01-04" });
  expect(
    activityPresetRange("lastMonth", Date.parse("2026-01-01T17:00Z")),
  ).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  expect(
    activityPresetRange("lastMonth", Date.parse("2024-03-01T17:00Z")),
  ).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  expect(
    activityPresetRange("thisMonth", Date.parse("2026-03-01T04:59Z")),
  ).toEqual({ from: "2026-02-01", to: "2026-02-28" });
});

test.each([
  "2026-02-29",
  "2026-04-31",
  "2026-00-01",
  "2026-13-01",
  "2026-1-01",
  "2026-11-06T00:00Z",
  "",
])("rejects invalid civil date %s", (value) => {
  expect(isActivityDate(value)).toBe(false);
});

test("accepts leap dates and displays the selected day without a local timezone shift", () => {
  expect(isActivityDate("2024-02-29")).toBe(true);
  expect(formatActivityDate("2026-11-06", "en-US")).toBe("Nov 6, 2026");
  expect(formatActivityDate("2026-11-06", "es")).toContain("6 nov 2026");
});
