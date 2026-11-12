// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { useEffect, useImperativeHandle, useRef } from "react";
import type { PdfViewerHandle } from "@/components/documents/pdf-viewer";
import type { Ref } from "react";
import commonEn from "@/messages/en/common.json";
import commonEs from "@/messages/es/common.json";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import en from "@/messages/en/coaches.json";
import es from "@/messages/es/coaches.json";
import type {
  CoachActivityDateRange,
  CoachActivityPeriod,
} from "@/lib/coaches/types";
import { ActivityReport } from "./activity-report";

const state = vi.hoisted(() => ({
  generate: vi.fn(),
  download: vi.fn(),
  print: vi.fn(),
  createUrl: vi.fn(),
  revokeUrl: vi.fn(),
}));
vi.mock("@/lib/coaches/activity-report-pdf", () => ({
  generateActivityReportPdf: state.generate,
}));
vi.mock("@/lib/documents/download-document", () => ({
  downloadDocument: state.download,
}));
vi.mock("next/dynamic", () => ({
  default: () =>
    function Viewer({
      src,
      onError,
      onReady,
      viewerRef,
    }: {
      src: string;
      onError: () => void;
      onReady: () => void;
      viewerRef: Ref<PdfViewerHandle>;
    }) {
      const ready = useRef(onReady);
      useEffect(() => ready.current(), []);
      useImperativeHandle(viewerRef, () => ({
        exportPdf: vi.fn(),
        printPdf: state.print,
      }));
      return (
        <div aria-label="PDF viewer" data-src={src}>
          <button onClick={onError}>Viewer error</button>
        </div>
      );
    },
}));
const range = { from: "2026-11-01", to: "2026-11-30" };
const coach = {
  name: "Elena Ramírez",
  program: "Baloncesto",
  position: "Entrenadora",
};
const ready: CoachActivityPeriod = {
  status: "ready",
  activities: [],
  summary: {
    activityCount: 0,
    totalDurationMs: 0,
    pendingCount: 0,
    unknownDurationCount: 0,
  },
};
function view(
  period: CoachActivityPeriod | undefined,
  selectedRange: CoachActivityDateRange | null = range,
  locale = "es",
) {
  return (
    <NextIntlClientProvider
      locale={locale}
      timeZone="America/New_York"
      messages={{
        Coaches: locale === "es" ? es : en,
        Common: locale === "es" ? commonEs : commonEn,
      }}
    >
      <ActivityReport coach={coach} range={selectedRange} period={period} />
    </NextIntlClientProvider>
  );
}
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  state.generate.mockResolvedValue(
    new Blob(["%PDF-test"], { type: "application/pdf" }),
  );
  state.createUrl.mockReturnValue("blob:report");
  vi.stubGlobal(
    "URL",
    Object.assign(class extends URL {}, {
      createObjectURL: state.createUrl,
      revokeObjectURL: state.revokeUrl,
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("all dates requires an explicit period and loading or oversized ranges cannot generate", () => {
  const result = render(view(ready, null));
  expect(
    result
      .getByRole("button", { name: "Generar reporte" })
      .getAttribute("aria-disabled"),
  ).toBe("true");
  expect(result.getByText(es.report.selectPeriod)).toBeTruthy();
  result.rerender(view(undefined));
  expect(
    result
      .getByRole("button", { name: "Generar reporte" })
      .hasAttribute("disabled"),
  ).toBe(true);
  result.rerender(view({ status: "limitExceeded" }));
  expect(
    result
      .getByRole("button", { name: "Generar reporte" })
      .hasAttribute("disabled"),
  ).toBe(true);
  expect(state.generate).not.toHaveBeenCalled();
});

test("the missing-period hint appears on focus without allowing report generation", async () => {
  const result = render(view(ready, null));
  const button = result.getByRole("button", { name: "Generar reporte" });
  expect(result.queryByRole("tooltip")).toBeNull();
  expect(result.getByText(es.report.selectPeriod).className).toBe("sr-only");
  fireEvent.focus(button);
  expect((await result.findByRole("tooltip")).textContent).toBe(
    es.report.selectPeriod,
  );
  fireEvent.click(button);
  expect(state.generate).not.toHaveBeenCalled();
  expect(result.queryByRole("dialog")).toBeNull();
  result.rerender(view(ready));
  expect(result.queryByRole("tooltip")).toBeNull();
  expect(button.getAttribute("aria-disabled")).toBe("false");
});

test.each(["es", "en"])(
  "touch shows the missing-period hint without generating a report (%s)",
  async (locale) => {
    vi.stubGlobal(
      "PointerEvent",
      class extends MouseEvent {
        readonly pointerType: string;
        constructor(type: string, options: PointerEventInit = {}) {
          super(type, options);
          this.pointerType = options.pointerType ?? "";
        }
      },
    );
    const messages = locale === "es" ? es : en;
    const result = render(view(ready, null, locale));
    const button = result.getByRole("button", {
      name: messages.report.generate,
    });
    fireEvent.pointerDown(button, { pointerType: "touch" });
    fireEvent.focus(button);
    fireEvent.pointerUp(button, { pointerType: "touch" });
    fireEvent.click(button);
    expect((await result.findByRole("tooltip")).textContent).toBe(
      messages.report.selectPeriod,
    );
    expect(state.generate).not.toHaveBeenCalled();
    expect(result.queryByRole("dialog")).toBeNull();
    fireEvent.keyDown(button, { key: "Escape" });
    await waitFor(() => expect(result.queryByRole("tooltip")).toBeNull());
    fireEvent.click(button);
    await result.findByRole("tooltip");
    result.rerender(view(ready, range, locale));
    expect(result.queryByRole("tooltip")).toBeNull();
    result.rerender(view(ready, null, locale));
    expect(result.queryByRole("tooltip")).toBeNull();
  },
);

test("an empty period generates once on demand, downloads the same PDF and restores focus on close", async () => {
  const result = render(view(ready));
  expect(state.generate).not.toHaveBeenCalled();
  const trigger = result.getByRole("button", { name: "Generar reporte" });
  trigger.focus();
  fireEvent.click(trigger);
  const download = await result.findByRole("button", { name: "Descargar PDF" });
  expect(state.generate).toHaveBeenCalledOnce();
  expect(state.generate.mock.calls[0][0]).toMatchObject({
    coach,
    range,
    period: ready,
    locale: "es",
  });
  fireEvent.click(download);
  await waitFor(() =>
    expect(state.download).toHaveBeenCalledWith(
      expect.any(Blob),
      "actividades-elena-ramirez-2026-11-01-2026-11-30-es.pdf",
    ),
  );
  expect(state.download.mock.calls[0][0]).toBe(
    await state.generate.mock.results[0].value,
  );
  expect(result.getByLabelText("PDF viewer").getAttribute("data-src")).toBe(
    "blob:report",
  );
  fireEvent.pointerDown(
    result.getByRole("button", { name: "Acciones del documento" }),
    { button: 0, ctrlKey: false },
  );
  expect(
    result
      .getByRole("menuitem", { name: "Abrir archivo" })
      .getAttribute("target"),
  ).toBe("_blank");
  fireEvent.click(result.getByRole("menuitem", { name: "Imprimir" }));
  await waitFor(() => expect(state.print).toHaveBeenCalledOnce());
  expect(state.generate).toHaveBeenCalledOnce();
  expect(result.queryByRole("button", { name: /Editar/ })).toBeNull();
  fireEvent.click(result.getByRole("button", { name: "Cerrar" }));
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(state.revokeUrl).toHaveBeenCalledWith("blob:report");
});

test("the generated snapshot is unchanged by realtime updates and reopens with the latest result", async () => {
  const result = render(view(ready));
  fireEvent.click(result.getByRole("button", { name: "Generar reporte" }));
  await result.findByRole("button", { name: "Descargar PDF" });
  const updated = {
    ...ready,
    summary: { ...ready.summary, activityCount: 12, totalDurationMs: 1234567 },
  };
  result.rerender(view(updated));
  expect(state.generate).toHaveBeenCalledOnce();
  expect(state.generate.mock.calls[0][0].period.summary.activityCount).toBe(0);
  fireEvent.click(result.getByRole("button", { name: "Cerrar" }));
  fireEvent.click(result.getByRole("button", { name: "Generar reporte" }));
  await waitFor(() => expect(state.generate).toHaveBeenCalledTimes(2));
  expect(state.generate.mock.calls[1][0].period.summary.totalDurationMs).toBe(
    1234567,
  );
});

test.each(["range", "locale", "access"])(
  "a changed %s invalidates the open report and releases its URL",
  async (change) => {
    const result = render(view(ready));
    fireEvent.click(result.getByRole("button", { name: "Generar reporte" }));
    await result.findByRole("button", { name: "Descargar PDF" });
    result.rerender(
      change === "range"
        ? view(ready, { from: "2026-10-01", to: "2026-10-31" })
        : change === "locale"
          ? view(ready, range, "en")
          : view(undefined),
    );
    expect(result.queryByRole("dialog")).toBeNull();
    expect(state.revokeUrl).toHaveBeenCalledWith("blob:report");
    result.rerender(view(ready));
    expect(result.queryByRole("dialog")).toBeNull();
  },
);

test("closing before generation completes never creates or exposes a stale download", async () => {
  let finish!: (blob: Blob) => void;
  state.generate.mockReturnValue(
    new Promise<Blob>((resolve) => {
      finish = resolve;
    }),
  );
  const result = render(view(ready));
  fireEvent.click(result.getByRole("button", { name: "Generar reporte" }));
  await waitFor(() => expect(state.generate).toHaveBeenCalledOnce());
  fireEvent.click(result.getByRole("button", { name: "Cerrar" }));
  await act(async () => finish(new Blob(["%PDF-late"])));
  expect(state.createUrl).not.toHaveBeenCalled();
  expect(result.queryByRole("dialog")).toBeNull();
});

test("generation errors can be retried without changing the selected range", async () => {
  state.generate.mockRejectedValueOnce(Error("offline"));
  const result = render(view(ready));
  fireEvent.click(result.getByRole("button", { name: "Generar reporte" }));
  expect((await result.findByRole("alert")).textContent).toContain(
    es.report.error,
  );
  expect(result.queryByRole("button", { name: "Descargar PDF" })).toBeNull();
  fireEvent.click(result.getByRole("button", { name: "Reintentar" }));
  await result.findByRole("button", { name: "Descargar PDF" });
  expect(state.generate).toHaveBeenCalledTimes(2);
});

test("English UI generates an English document and a failed viewer retains download access", async () => {
  const result = render(view(ready, range, "en"));
  fireEvent.click(result.getByRole("button", { name: "Generate report" }));
  await result.findByRole("button", { name: "Download PDF" });
  expect(state.generate.mock.calls[0][0].locale).toBe("en");
  expect(state.generate.mock.calls[0][1]("report.title")).toBe(
    "Activity report",
  );
  fireEvent.click(result.getByRole("button", { name: "Viewer error" }));
  expect(result.getByRole("status").textContent).toBe(en.report.previewError);
  expect(result.getByRole("button", { name: "Download PDF" })).toBeTruthy();
});
