// @vitest-environment jsdom
import { createTranslator } from "next-intl";
import { afterEach, expect, test, vi } from "vitest";
import es from "@/messages/es/coaches.json";
import type { CoachActivityReportSnapshot } from "./types";
import { generateActivityReportPdf } from "./activity-report-pdf";
const state = vi.hoisted(() => ({
  create: vi.fn(),
  fonts: vi.fn(),
  blob: vi.fn(),
}));
vi.mock("pdfmake/build/pdfmake", () => ({
  default: { addVirtualFileSystem: state.fonts, createPdf: state.create },
}));
vi.mock("pdfmake/build/vfs_fonts", () => ({
  default: { "Roboto-Regular.ttf": "font-data" },
}));
const snapshot: CoachActivityReportSnapshot = {
  coach: {
    name: "Elena Ramírez",
    program: "Baloncesto",
    position: "Entrenadora",
  },
  range: { from: "2026-11-01", to: "2026-11-30" },
  locale: "es",
  generatedAt: 1793977200000,
  period: {
    status: "ready",
    activities: [],
    summary: {
      activityCount: 0,
      totalDurationMs: 0,
      pendingCount: 0,
      unknownDurationCount: 0,
    },
  },
};
const t = createTranslator({ locale: "es", messages: es });
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test("the browser generator loads the local logo, registers fonts and returns the PDF blob", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["logo"], { type: "image/png" }),
    });
  vi.stubGlobal("fetch", fetch);
  const blob = new Blob(["%PDF-test"], { type: "application/pdf" });
  state.create.mockReturnValue({ getBlob: state.blob });
  state.blob.mockResolvedValue(blob);
  expect(await generateActivityReportPdf(snapshot, t)).toBe(blob);
  expect(fetch).toHaveBeenCalledWith("/cpca-logo.png");
  expect(state.fonts).toHaveBeenCalledWith({
    "Roboto-Regular.ttf": "font-data",
  });
  expect(state.create.mock.calls[0][0].images.cpcaLogo).toBe(
    "data:image/png;base64,bG9nbw==",
  );
});

test("a missing logo fails explicitly instead of generating an unbranded or partial report", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  await expect(generateActivityReportPdf(snapshot, t)).rejects.toThrow(
    "REPORT_LOGO_UNAVAILABLE",
  );
  expect(state.create).not.toHaveBeenCalled();
});
