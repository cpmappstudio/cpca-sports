// @vitest-environment node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createTranslator } from "next-intl";
import { expect, test, vi } from "vitest";
import type { ContentTable } from "pdfmake/interfaces";
import pdfMake from "pdfmake";
import en from "@/messages/en/coaches.json";
import es from "@/messages/es/coaches.json";
import type {
  CoachActivityListItem,
  CoachActivityReportSnapshot,
} from "./types";
import { summarizeActivityPeriod } from "@/convex/lib/coachActivityPeriod";
import { buildActivityReport } from "./activity-report";

function activity(index: number): CoachActivityListItem {
  const timestamp = Date.parse("2026-11-02T15:00:00Z") + index * 60000;
  return {
    _id: `activity-${index}` as CoachActivityListItem["_id"],
    _creationTime: 1,
    coachId: "coach" as CoachActivityListItem["coachId"],
    programId: "program" as CoachActivityListItem["programId"],
    placeId: "place" as CoachActivityListItem["placeId"],
    placeName: "Cancha de preparación física",
    activityDate: "2026-11-02",
    startTime: "10:00",
    endTime: "10:45",
    title: `Práctica ${index}`,
    imageStorageId: "photo" as CoachActivityListItem["imageStorageId"],
    checkInAt: timestamp,
    checkOutAt: timestamp + 2700000,
    checkInOrder: timestamp,
    checkOutOrder: timestamp + 2700000,
    status: "completed",
    completed: true,
    durationMs: 2700000,
    createdBy: "user" as CoachActivityListItem["createdBy"],
    updatedBy: "user" as CoachActivityListItem["updatedBy"],
    createdAt: 1,
    updatedAt: 1,
  };
}
function snapshot(
  activities: CoachActivityListItem[],
  locale = "es",
): CoachActivityReportSnapshot {
  return {
    coach: {
      name: "Elena Ramírez",
      program: "Baloncesto",
      position: "Entrenadora",
    },
    range: { from: "2026-11-01", to: "2026-11-30" },
    locale,
    generatedAt: Date.parse("2026-11-12T15:00:00Z"),
    period: {
      status: "ready",
      activities,
      summary: summarizeActivityPeriod(activities),
    },
  };
}
const translate = (locale: string) =>
  createTranslator({ locale, messages: locale === "es" ? es : en });
const demoLogo =
  "data:image/png;base64," +
  (
    await readFile(new URL("../../public/cpca-logo.png", import.meta.url))
  ).toString("base64");
const detailTable = (data: CoachActivityReportSnapshot) => {
  const definition = buildActivityReport(
    data,
    translate(data.locale),
    demoLogo,
  );
  return (definition.content as ContentTable[]).find(
    (item) => item.table?.headerRows === 1,
  )!;
};

test("the report uses the entire period, sorts a copy, and preserves backend durations and totals", () => {
  const rows = Array.from({ length: 27 }, (_, i) => activity(i)).reverse();
  rows[0] = {
    ...rows[0],
    status: "in_progress",
    completed: false,
    checkOutOrder: null,
    durationMs: null,
  };
  rows[1] = { ...rows[1], checkOutOrder: null, durationMs: null };
  rows[2] = { ...rows[2], durationMs: 185000 };
  const data = snapshot(rows);
  const definition = buildActivityReport(data, translate("es"), demoLogo);
  const body = detailTable(data).table.body;
  expect(body).toHaveLength(28);
  expect(body[1][0]).toEqual({ text: "Práctica 0", bold: true });
  expect(body[27][4]).toMatchObject({ text: "Pendiente" });
  expect(body[26][5]).toBe("Horario incompleto");
  expect(rows[0].title).toBe("Práctica 26");
  expect(JSON.stringify(definition.content)).toContain(
    "Suma de 25 de las 27 actividades",
  );
  expect(JSON.stringify(definition.content)).toContain("3 min");
  expect(JSON.stringify(definition.content)).not.toMatch(
    /No realizada|pago|descontado|superpone/,
  );
  expect(definition.header).toMatchObject({
    columns: [{ image: "cpcaLogo", alignment: "left" }],
  });
});

test.each(["es", "en"])(
  "all report text, counts, empty and missing-time states are localized (%s)",
  (locale) => {
    const t = translate(locale);
    const empty = buildActivityReport(snapshot([], locale), t, demoLogo);
    expect(JSON.stringify(empty.content)).toContain(t("report.empty"));
    expect(JSON.stringify(empty.content)).not.toContain(
      t("report.excludedTitle"),
    );
    expect(JSON.stringify(empty.content)).toContain("0 min");
    const unknown = snapshot(
      [{ ...activity(0), checkOutOrder: null, durationMs: null }],
      locale,
    );
    const json = JSON.stringify(
      buildActivityReport(unknown, t, demoLogo).content,
    );
    expect(json).toContain(t("detail.durationUnavailable"));
    expect(json).not.toContain('"0 min"');
    expect(json).toContain(t("report.unknownExcluded", { count: 1 }));
    expect(t("report.pendingExcluded", { count: 2 })).toContain("2");
    expect(
      detailTable(snapshot([activity(0)], locale)).table.body[0].every(
        (cell) => !JSON.stringify(cell).includes("detail."),
      ),
    ).toBe(true);
  },
);

test("legacy display uses the canonical listing timestamps and supplied duration without recalculating", () => {
  const legacy = {
    ...activity(0),
    checkInAt: undefined,
    checkOutAt: undefined,
    status: undefined,
    durationMs: 4500000,
  };
  const body = detailTable(snapshot([legacy])).table.body;
  expect(body[1][2]).toContain("2026");
  expect(body[1][4]).toMatchObject({ text: "1 h 15 min" });
  expect(body[1][5]).toBe("Completada");
});

function configurePdfMake() {
  const require = createRequire(import.meta.url);
  pdfMake.setUrlAccessPolicy(() => false);
  pdfMake.setLocalAccessPolicy((file) =>
    file.includes("pdfmake/fonts/Roboto/"),
  );
  pdfMake.addFonts({
    Roboto: {
      normal: require.resolve("pdfmake/fonts/Roboto/Roboto-Regular.ttf"),
      bold: require.resolve("pdfmake/fonts/Roboto/Roboto-Medium.ttf"),
      italics: require.resolve("pdfmake/fonts/Roboto/Roboto-Italic.ttf"),
      bolditalics:
        require.resolve("pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf"),
    },
  });
}

test("real PDFs render with embedded fonts and logo in both languages, including the 1000-row limit", async () => {
  configurePdfMake();
  const rows = Array.from({ length: 27 }, (_, i) => activity(i));
  rows[2].title =
    "Sesión de acondicionamiento físico y coordinación: movilidad, estabilidad y recuperación activa con el grupo de iniciación";
  rows[3] = {
    ...rows[3],
    status: "in_progress",
    completed: false,
    durationMs: null,
    checkOutOrder: null,
  };
  rows[4] = { ...rows[4], durationMs: null, checkOutOrder: null };
  rows[5].durationMs = 0;
  const cases = [
    ["es", rows, "report-es"],
    ["en", rows, "report-en"],
    ["es", [], "report-empty"],
    ["en", Array.from({ length: 1000 }, (_, i) => activity(i)), "report-1000"],
  ] as const;
  for (const [locale, activities, name] of cases) {
    const definition = buildActivityReport(
      snapshot([...activities], locale),
      translate(locale),
      demoLogo,
    );
    const buffer = await pdfMake.createPdf(definition).getBuffer();
    expect(Buffer.from(buffer).subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.byteLength).toBeGreaterThan(20000);
    if (process.env.REPORT_QA_OUTPUT_DIR) {
      await mkdir(process.env.REPORT_QA_OUTPUT_DIR, { recursive: true });
      await writeFile(
        `${process.env.REPORT_QA_OUTPUT_DIR}/${name}.pdf`,
        buffer,
      );
    }
  }
}, 30000);

test.each(["es", "en"])(
  "extreme content is fully drawn within the page without overlapping other text (%s)",
  async (locale) => {
    configurePdfMake();
    const require = createRequire(import.meta.url);
    const { PDFDocument } = createRequire(require.resolve("pdfmake"))(
      "pdfkit",
    ) as {
      PDFDocument: { prototype: PDFKit.PDFDocument };
    };
    const drawText = PDFDocument.prototype.text as (
      this: PDFKit.PDFDocument,
      text: string,
      x?: number | PDFKit.Mixins.TextOptions,
      y?: number,
      options?: PDFKit.Mixins.TextOptions,
    ) => PDFKit.PDFDocument;
    const drawn: {
      text: string;
      page: object;
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = [];
    const spy = vi
      .spyOn(PDFDocument.prototype, "text")
      .mockImplementation(function (
        this: PDFKit.PDFDocument,
        text: string,
        x?: number | PDFKit.Mixins.TextOptions,
        y?: number,
        options?: PDFKit.Mixins.TextOptions,
      ) {
        if (typeof x === "number" && typeof y === "number" && text.trim()) {
          drawn.push({
            text,
            page: this.page,
            x,
            y,
            width: this.widthOfString(text, options),
            height: this.currentLineHeight(),
          });
        }
        return drawText.call(this, text, x, y, options);
      } as PDFKit.PDFDocument["text"]);
    try {
      const data = snapshot(
        [
          {
            ...activity(0),
            title: "TOKENSTART " + "W".repeat(800) + " TOKENEND",
            placeName: "PLACESTART " + "W".repeat(300) + " PLACEEND",
          },
          {
            ...activity(1),
            title:
              "LONGSTART " +
              "Entrenamiento coordinación movilidad y resistencia. ".repeat(
                140,
              ) +
              " LONGEND",
            placeName:
              "LONGPLACESTART " +
              "Cancha de preparación física.\n".repeat(100) +
              " LONGPLACEEND",
          },
          { ...activity(2), title: "FOLLOWINGACTIVITY" },
        ],
        locale,
      );
      data.coach = {
        name: "NAMESTART " + "W".repeat(500) + " NAMEEND",
        program: "PROGRAMSTART " + "W".repeat(400) + " PROGRAMEND",
        position: "POSITIONSTART " + "W".repeat(400) + " POSITIONEND",
      };
      data.period.summary.totalDurationMs = 1.728e19;
      const buffer = await pdfMake
        .createPdf(buildActivityReport(data, translate(locale), demoLogo))
        .getBuffer();
      expect(Buffer.from(buffer).subarray(0, 5).toString()).toBe("%PDF-");
      const text = drawn.map((span) => span.text).join("");
      for (const marker of [
        "TOKENSTART",
        "TOKENEND",
        "PLACESTART",
        "PLACEEND",
        "LONGSTART",
        "LONGEND",
        "LONGPLACESTART",
        "LONGPLACEEND",
        "FOLLOWINGACTIVITY",
        "NAMESTART",
        "NAMEEND",
        "PROGRAMSTART",
        "PROGRAMEND",
        "POSITIONSTART",
        "POSITIONEND",
      ]) {
        expect(text, marker).toContain(marker);
      }
      for (const [index, span] of drawn.entries()) {
        expect(span.x, span.text).toBeGreaterThanOrEqual(31);
        expect(span.x + span.width, span.text).toBeLessThanOrEqual(761);
        expect(span.y, span.text).toBeGreaterThanOrEqual(15);
        expect(span.y + span.height, span.text).toBeLessThanOrEqual(598);
        const overlapping = drawn
          .slice(index + 1)
          .find(
            (other) =>
              span.page === other.page &&
              Math.min(span.x + span.width, other.x + other.width) -
                Math.max(span.x, other.x) >
                1 &&
              Math.min(span.y + span.height, other.y + other.height) -
                Math.max(span.y, other.y) >
                1,
          );
        expect(overlapping, span.text).toBeUndefined();
      }
      if (process.env.REPORT_QA_OUTPUT_DIR) {
        await mkdir(process.env.REPORT_QA_OUTPUT_DIR, { recursive: true });
        await writeFile(
          `${process.env.REPORT_QA_OUTPUT_DIR}/report-extreme-${locale}.pdf`,
          buffer,
        );
      }
    } finally {
      spy.mockRestore();
    }
  },
);
