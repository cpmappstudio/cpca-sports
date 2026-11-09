// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, expect, test, vi } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import type { CoachActivityListItem } from "@/lib/coaches/types";
import messages from "@/messages/es/coaches.json";
import { CoachActivitiesTable } from "./coach-activities-table";
import common from "@/messages/es/common.json";
const pagination = {
  pageLabel: "Página 1",
  navigationLabel: "Páginas",
  canPreviousPage: false,
  canNextPage: false,
  onPreviousPage: () => {},
  onNextPage: () => {},
};

const activity: CoachActivityListItem = {
  _id: "activity" as Id<"coachActivities">,
  _creationTime: 1,
  coachId: "coach" as Id<"coaches">,
  programId: "program" as Id<"programs">,
  placeId: "place" as Id<"programCoachOptions">,
  placeName: "Campo",
  title: "Entrenamiento",
  description: "Descripción reservada para el detalle",
  activityDate: "2026-11-06",
  startTime: "13:20",
  checkInAt: Date.parse("2026-11-06T18:20:00Z"),
  checkInOrder: Date.parse("2026-11-06T18:20:00Z"),
  checkOutOrder: null,
  imageStorageId: "photo" as Id<"_storage">,
  durationMs: null,
  status: "in_progress",
  completed: false,
  createdBy: "owner" as Id<"users">,
  updatedBy: "owner" as Id<"users">,
  createdAt: 1,
  updatedAt: 1,
};
function html(record: CoachActivityListItem) {
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale="es"
      timeZone="America/New_York"
      messages={{ Coaches: messages, Common: common }}
    >
      <CoachActivitiesTable
        data={[record]}
        completed={record.status !== "in_progress"}
        isLoading={false}
        pagination={pagination}
        sorting={[{ id: "checkIn", desc: true }]}
        onSortingChange={() => {}}
        onView={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onCheckout={() => {}}
      />
    </NextIntlClientProvider>,
  );
}
test("compact rows show title, place and fixed check-in without loading photos or descriptions", () => {
  const result = html(activity);
  expect(result).toContain("Entrenamiento");
  expect(result).toContain("Campo");
  expect(result).toContain('dateTime="2026-11-06T18:20:00.000Z"');
  expect(result).toContain("Registrar salida");
  expect(result).not.toContain("<img");
  expect(result).not.toContain(activity.description);
  expect(result).not.toContain('data-slot="card"');
  expect(result).not.toContain("Duración");
});
test("historical incomplete rows keep original time and never offer checkout", () => {
  const result = html({
    ...activity,
    status: undefined,
    checkInAt: undefined,
    startTime: "08:00",
  });
  expect(result).toContain("08:00");
  expect(result).toContain("horario original");
  expect(result).not.toContain('data-slot="badge"');
  expect(result).toContain('tabindex="0"');
  expect(result).not.toContain(">Ver detalle</button>");
  expect(result).not.toContain("Registrar salida");
});

test("completed rows show full check-in and checkout timestamps without a status badge", () => {
  const result = html({
    ...activity,
    status: "completed",
    completed: true,
    checkInAt: Date.parse("2026-11-07T04:50:00Z"),
    checkOutAt: Date.parse("2026-11-07T05:10:00Z"),
  });
  expect(result).toContain('dateTime="2026-11-07T04:50:00.000Z"');
  expect(result).toContain('dateTime="2026-11-07T05:10:00.000Z"');
  expect(result).toContain("Salida");
  expect(result).not.toContain('data-slot="badge"');
  expect(result).not.toContain("Registrar salida");
});
test("earlier checkout preserves the original recorded clock time without inventing a timestamp", () => {
  const result = html({
    ...activity,
    checkInAt: undefined,
    status: undefined,
    completed: true,
    endTime: "14:45",
  });
  expect(result).toContain("2026-11-06 · 14:45");
  expect(result).not.toContain("dateTime=");
});

afterEach(cleanup);
test("clicking the row opens the detail, while hovering does not", () => {
  const onView = vi.fn();
  const result = render(
    <NextIntlClientProvider
      locale="es"
      timeZone="America/New_York"
      messages={{ Coaches: messages, Common: common }}
    >
      <CoachActivitiesTable
        data={[{ ...activity, status: "completed", completed: true }]}
        completed
        isLoading={false}
        pagination={pagination}
        sorting={[{ id: "checkIn", desc: true }]}
        onSortingChange={() => {}}
        onView={onView}
        onEdit={() => {}}
        onDelete={() => {}}
        onCheckout={() => {}}
      />
    </NextIntlClientProvider>,
  );
  const row = result.getAllByRole("row")[1];
  expect(row.className).toContain("cursor-pointer");
  fireEvent.mouseOver(row);
  expect(onView).not.toHaveBeenCalled();
  fireEvent.click(row);
  expect(onView).toHaveBeenCalledExactlyOnceWith(activity._id);
});

test.each([
  [null, "No disponible"],
  [0, "&lt;1 min"],
  [45000, "&lt;1 min"],
  [60000, "1 min"],
  [240000, "4 min"],
  [3540000, "59 min"],
  [3600000, "1 h 0 min"],
  [5100000, "1 h 25 min"],
  [90900000, "25 h 15 min"],
])("duration formats the backend value %j as %s", (durationMs, expected) => {
  const result = html({
    ...activity,
    status: "completed",
    completed: true,
    durationMs,
  });
  expect(result).toContain("Duración");
  expect(result).toContain(expected);
});
