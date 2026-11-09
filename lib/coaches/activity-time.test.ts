import { expect, test } from "vitest";
import { formatActivityTimestamp } from "./activity-time";
import { CAMERA_ERRORS } from "./camera";
import en from "@/messages/en/coaches.json";
import es from "@/messages/es/coaches.json";

test("activity timestamps always use Poinciana and account for seasonal offsets", () => {
  expect(
    formatActivityTimestamp(Date.parse("2026-01-15T15:00:00Z"), "en-US"),
  ).toMatch(/10:00.*EST/);
  expect(
    formatActivityTimestamp(Date.parse("2026-07-15T15:00:00Z"), "en-US"),
  ).toMatch(/11:00.*EDT/);
  expect(
    formatActivityTimestamp(Date.parse("2026-11-07T04:50:00Z"), "en-US"),
  ).toMatch(/Nov 6/);
});
test("camera errors and UI message keys exist in both languages", () => {
  const keys = (value: object, prefix = ""): string[] =>
    Object.entries(value).flatMap(([key, child]) =>
      typeof child === "object" && child
        ? keys(child, `${prefix}${key}.`)
        : `${prefix}${key}`,
    );
  expect(keys(es).sort()).toEqual(keys(en).sort());
  for (const code of CAMERA_ERRORS) {
    expect(es.camera.errors[code]).toBeTruthy();
    expect(en.camera.errors[code]).toBeTruthy();
  }
});
