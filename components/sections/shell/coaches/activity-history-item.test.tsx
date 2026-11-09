// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { expect, test } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import type { CoachActivity } from "@/lib/coaches/types";
import messages from "@/messages/es/coaches.json";
import { ActivityHistoryItem } from "./activity-history-item";
const base: CoachActivity = {
  _id: "activity" as Id<"coachActivities">,
  _creationTime: 1,
  coachId: "coach" as Id<"coaches">,
  programId: "program" as Id<"programs">,
  placeId: "place" as Id<"programCoachOptions">,
  placeName: "Campo",
  title: "Bateo",
  activityDate: "2026-11-06",
  startTime: "23:50",
  imageStorageId: "photo" as Id<"_storage">,
  imageUrl: "https://example.com/entry.jpg",
  checkOutImageUrl: null,
  completed: false,
  createdBy: "owner" as Id<"users">,
  updatedBy: "owner" as Id<"users">,
  createdAt: 1,
  updatedAt: 1,
};
function html(activity: CoachActivity) {
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale="es"
      timeZone="America/New_York"
      messages={{ Coaches: messages }}
    >
      <ActivityHistoryItem
        activity={activity}
        onEdit={() => {}}
        onDelete={() => {}}
        onCheckout={() => {}}
      />
    </NextIntlClientProvider>,
  );
}

test("completed activities show independent entry and exit photos and full dates", () => {
  const result = html({
    ...base,
    checkInAt: Date.parse("2026-11-07T04:50:00Z"),
    checkOutAt: Date.parse("2026-11-07T05:10:00Z"),
    status: "completed",
    completed: true,
    checkOutImageUrl: "https://example.com/exit.jpg",
  });
  expect(result).toContain("Foto de entrada");
  expect(result).toContain("Foto de salida");
  expect(result).toContain("entry.jpg");
  expect(result).toContain("exit.jpg");
  expect(result).toContain("2026-11-07T04:50:00.000Z");
  expect(result).toContain("2026-11-07T05:10:00.000Z");
  expect(result).toContain("Finalizada");
  expect(result).not.toContain(messages.detail.checkout);
});
test("historical incomplete records preserve their original times and never offer checkout", () => {
  const result = html({
    ...base,
    activityDate: "2025-03-01",
    startTime: "08:00",
    endTime: "09:00",
  });
  expect(result).toContain("2025-03-01");
  expect(result).toContain("08:00–09:00");
  expect(result).toContain("horario original");
  expect(result).toContain("No realizada");
  expect(result).not.toContain(messages.detail.checkout);
  expect(result).not.toContain("Foto de salida");
});

test("open activities show their entry and checkout action without redundant pending information", () => {
  const result = html({
    ...base,
    checkInAt: Date.parse("2026-11-07T04:50:00Z"),
    status: "in_progress",
  });
  expect(result).toContain("En curso");
  expect(result).toContain("Registrar salida");
  expect(result).toContain("2026-11-07T04:50:00.000Z");
  expect(result).toContain("Foto de entrada");
  expect(result).not.toContain("Pendiente de checkout");
  expect(result).not.toContain(
    '<dt class="text-xs text-muted-foreground">Salida</dt>',
  );
});
