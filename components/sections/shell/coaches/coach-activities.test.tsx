// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import type {
  CoachActivityPeriod,
  CoachActivityPeriodSelection,
} from "@/lib/coaches/types";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import type { CoachActivity, CoachActivityListItem } from "@/lib/coaches/types";
import messages from "@/messages/es/coaches.json";
import common from "@/messages/es/common.json";
type ActivityRecord = CoachActivity & CoachActivityListItem;
import { CoachActivities } from "./coach-activities";

const state = vi.hoisted(() => ({
  open: [] as ActivityRecord[],
  history: [] as ActivityRecord[],
  remove: vi.fn(),
  openNext: [] as ActivityRecord[],
  historyNext: [] as ActivityRecord[],
  selected: null as CoachActivity | null,
  query: vi.fn(),
  canLoad: false,
  openActivityId: undefined as string | null | undefined,
  loadingOpenActivity: false,
}));
vi.mock("convex/react", async () => {
  const { getFunctionName } = await import("convex/server");
  return {
    useMutation: () => state.remove,
    useQuery: (
      reference: Parameters<typeof getFunctionName>[0],
      args: "skip" | { paginationOpts?: { cursor: string | null } },
    ) => {
      const name = getFunctionName(reference);
      state.query(name, args);
      if (args === "skip") return undefined;
      if (name.endsWith("getOpenActivityId"))
        return state.loadingOpenActivity
          ? undefined
          : state.openActivityId === undefined
            ? (state.open[0]?._id ?? null)
            : state.openActivityId;
      if (name.endsWith("getById")) return state.selected;
      const isOpen = name.endsWith("listOpenByCoach");
      const next = args.paginationOpts?.cursor === "next";
      return {
        page: isOpen
          ? next
            ? state.openNext
            : state.open
          : next
            ? state.historyNext
            : state.history,
        isDone: next || !state.canLoad,
        continueCursor: "next",
      };
    },
  };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("./activity-dialog", () => ({
  ActivityDialog: ({
    action,
    activityId,
  }: {
    action: string;
    activityId?: string;
  }) => (
    <p role="status">
      {action}:{activityId ?? "new"}
    </p>
  ),
}));
vi.mock("./activity-actions", () => ({
  ActivityActions: ({
    onEdit,
    onDelete,
  }: {
    onEdit: () => void;
    onDelete: () => void;
  }) => (
    <>
      <button onClick={onEdit}>Editar</button>
      <button onClick={onDelete}>Eliminar actividad</button>
    </>
  ),
}));
function activityElement(result: ReturnType<typeof view>, name: string) {
  return within(result.getByRole("table")).getAllByText(name)[0].closest("tr")!;
}
function activityRow(result: ReturnType<typeof view>, name: string) {
  return within(activityElement(result, name));
}
function record(id: string): ActivityRecord {
  return {
    _id: id as Id<"coachActivities">,
    _creationTime: 1,
    coachId: "coach" as Id<"coaches">,
    programId: "program" as Id<"programs">,
    placeId: "place" as Id<"programCoachOptions">,
    placeName: "Campo",
    title: id,
    activityDate: "2026-11-06",
    startTime: "10:00",
    checkInAt: 1793977200000,
    checkInOrder: 1793977200000,
    checkOutOrder: null,
    imageStorageId: "photo" as Id<"_storage">,
    imageUrl: null,
    checkOutImageUrl: null,
    durationMs: null,
    status: "in_progress",
    completed: false,
    createdBy: "owner" as Id<"users">,
    updatedBy: "owner" as Id<"users">,
    createdAt: 1,
    updatedAt: 1,
  };
}
function view(isArchived = false) {
  return render(
    <NextIntlClientProvider
      locale="es"
      timeZone="America/New_York"
      messages={{ Coaches: messages, Common: common }}
    >
      <CoachActivities
        coachId={"coach" as Id<"coaches">}
        isArchived={isArchived}
        periodSelection={{ preset: "all", range: null }}
        onPeriodChange={vi.fn()}
      />
    </NextIntlClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  state.open = [record("Primera"), record("Segunda")];
  state.history = [];
  state.openNext = [record("Tercera")];
  state.historyNext = [];
  state.selected = null;
  state.canLoad = false;
  state.openActivityId = undefined;
  state.loadingOpenActivity = false;
  state.remove.mockResolvedValue(null);
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});

test("existing open activities replace check-in with checkout of the pending activity", () => {
  const result = view();
  expect(within(result.getByRole("table")).getAllByRole("row")).toHaveLength(3);
  expect(
    result.queryByRole("button", { name: "Registrar entrada" }),
  ).toBeNull();
  expect(
    within(
      result.getByRole("note", { name: messages.detail.openActivityTitle }),
    ).getByText(messages.activityDialog.errors.activityInProgress),
  ).toBeTruthy();
  fireEvent.click(
    within(
      result.getByRole("group", { name: messages.detail.activityActions }),
    ).getByRole("button", { name: "Registrar salida" }),
  );
  expect(result.getByRole("status").textContent).toBe("checkOut:Primera");
});

test("check-in becomes available only after the global open-activity query has loaded", () => {
  state.open = [];
  state.loadingOpenActivity = true;
  const result = view();
  const checkIn = result.getByRole("button", { name: "Registrar entrada" });
  expect(checkIn.hasAttribute("disabled")).toBe(true);
  fireEvent.click(checkIn);
  expect(result.queryByText("checkIn:new")).toBeNull();
});

test("checkout on another device restores the check-in action reactively", () => {
  const result = view();
  expect(
    result.queryByRole("button", { name: "Registrar entrada" }),
  ).toBeNull();
  state.open = [];
  result.rerender(
    <NextIntlClientProvider
      locale="es"
      timeZone="America/New_York"
      messages={{ Coaches: messages, Common: common }}
    >
      <CoachActivities
        coachId={"coach" as Id<"coaches">}
        isArchived={false}
        periodSelection={{ preset: "all", range: null }}
        onPeriodChange={vi.fn()}
      />
    </NextIntlClientProvider>,
  );
  fireEvent.click(result.getByRole("button", { name: "Registrar entrada" }));
  expect(result.getByText("checkIn:new")).toBeTruthy();
  expect(
    result.queryByText(messages.activityDialog.errors.activityInProgress),
  ).toBeNull();
});
test("each checkout targets its own activity", () => {
  const result = view();
  fireEvent.click(
    activityRow(result, "Segunda").getByRole("button", {
      name: "Registrar salida",
    }),
  );
  expect(result.getByRole("status").textContent).toBe("checkOut:Segunda");
});
test("archiving prevents a new check-in while preserving checkout", () => {
  const result = view(true);
  expect(
    result.queryByRole("button", { name: "Registrar entrada" }),
  ).toBeNull();
  fireEvent.click(
    activityRow(result, "Primera").getByRole("button", {
      name: "Registrar salida",
    }),
  );
  expect(result.getByRole("status").textContent).toBe("checkOut:Primera");
});
test("pagination replaces rows and previous returns to the first page", () => {
  state.canLoad = true;
  const result = view();
  fireEvent.click(result.getByRole("button", { name: "Siguiente" }));
  expect(
    within(result.getByRole("table")).queryAllByText("Primera")[0] ?? null,
  ).toBeNull();
  expect(within(result.getByRole("table")).getAllByRole("row")).toHaveLength(2);
  expect(
    within(result.getByRole("table")).getAllByText("Tercera")[0],
  ).toBeTruthy();
  expect(result.getByText("Página 2")).toBeTruthy();
  fireEvent.click(result.getByRole("button", { name: "Anterior" }));
  expect(
    within(result.getByRole("table")).getAllByText("Primera")[0],
  ).toBeTruthy();
  expect(
    within(result.getByRole("table")).queryAllByText("Tercera")[0] ?? null,
  ).toBeNull();
});
test("tabs show only one list, reset pagination and preserve open activities", () => {
  state.canLoad = true;
  state.history = [
    { ...record("Finalizada"), status: "completed", completed: true },
  ];
  const result = view();
  fireEvent.click(result.getByRole("button", { name: "Siguiente" }));
  fireEvent.mouseDown(result.getByRole("tab", { name: "Completadas" }), {
    button: 0,
    ctrlKey: false,
  });
  expect(
    within(result.getByRole("table")).getAllByText("Finalizada")[0],
  ).toBeTruthy();
  expect(
    within(result.getByRole("table")).queryAllByText("Primera")[0] ?? null,
  ).toBeNull();
  expect(
    within(result.getByRole("table")).queryAllByText("Tercera")[0] ?? null,
  ).toBeNull();
  expect(result.getByText("Página 1")).toBeTruthy();
  fireEvent.mouseDown(result.getByRole("tab", { name: "En curso" }), {
    button: 0,
    ctrlKey: false,
  });
  expect(
    within(result.getByRole("table")).getAllByText("Primera")[0],
  ).toBeTruthy();
  expect(
    within(result.getByRole("table")).queryAllByText("Finalizada")[0] ?? null,
  ).toBeNull();
});
test("history is the default when there are no open activities", () => {
  state.open = [];
  state.history = [{ ...record("Registro anterior"), status: undefined }];
  const result = view();
  expect(
    result
      .getByRole("tab", { name: "Completadas" })
      .getAttribute("aria-selected"),
  ).toBe("true");
  expect(
    within(result.getByRole("table")).getAllByText("Registro anterior")[0],
  ).toBeTruthy();
});
test("selecting an activity loads its details on demand and retains photo evidence", () => {
  state.selected = {
    ...record("Primera"),
    description: "Trabajo de coordinación",
    imageUrl: "https://example.com/entry.jpg",
  };
  const result = view();
  expect(result.queryByText("Trabajo de coordinación")).toBeNull();
  expect(result.container.querySelector("img")).toBeNull();
  fireEvent.click(activityElement(result, "Primera"));
  expect(result.getByRole("dialog")).toBeTruthy();
  expect(result.getByText("Trabajo de coordinación")).toBeTruthy();
  expect(
    result.getByRole("button", { name: "Foto de entrada: Primera" }),
  ).toBeTruthy();
  expect(state.query).toHaveBeenCalledWith("coachActivities:getById", {
    activityId: "Primera",
  });
});
test("coach deletion asks for confirmation and deletes the selected activity", async () => {
  const result = view();
  fireEvent.click(
    activityRow(result, "Segunda").getByRole("button", {
      name: "Eliminar actividad",
    }),
  );
  expect(state.remove).not.toHaveBeenCalled();
  fireEvent.click(result.getByRole("button", { name: "Eliminar" }));
  await waitFor(() =>
    expect(state.remove).toHaveBeenCalledWith({ activityId: "Segunda" }),
  );
});

test("an emptied later page returns to the previous page after a remote checkout", () => {
  state.canLoad = true;
  const result = view();
  fireEvent.click(result.getByRole("button", { name: "Siguiente" }));
  expect(
    within(result.getByRole("table")).getAllByText("Tercera")[0],
  ).toBeTruthy();
  state.openNext = [];
  result.rerender(
    <NextIntlClientProvider
      locale="es"
      timeZone="America/New_York"
      messages={{ Coaches: messages, Common: common }}
    >
      <CoachActivities
        coachId={"coach" as Id<"coaches">}
        isArchived={false}
        periodSelection={{ preset: "all", range: null }}
        onPeriodChange={vi.fn()}
      />
    </NextIntlClientProvider>,
  );
  expect(
    within(result.getByRole("table")).getAllByText("Primera")[0],
  ).toBeTruthy();
  expect(result.getByText("Página 1")).toBeTruthy();
});
test.each(["mouse", "keyboard"] as const)(
  "closing the detail restores focus to its %s row opener",
  async (input) => {
    state.selected = record("Primera");
    const result = view();
    const opener = activityElement(result, "Primera");
    opener.focus();
    if (input === "mouse") fireEvent.click(opener);
    else fireEvent.keyDown(opener, { key: "Enter" });
    expect(result.getByRole("dialog")).toBeTruthy();
    fireEvent.click(result.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(document.activeElement).toBe(opener));
  },
);

test("editing targets the selected activity without changing the others", () => {
  const result = view();
  fireEvent.click(
    activityRow(result, "Segunda").getByRole("button", { name: "Editar" }),
  );
  expect(result.getByRole("status").textContent).toBe("edit:Segunda");
});

test("completed activities have separate activity, place, checkout and duration columns", () => {
  state.open = [];
  state.history = [
    {
      ...record("Finalizada"),
      status: "completed",
      completed: true,
      checkOutAt: 1793977500000,
      durationMs: 300000,
    },
  ];
  const result = view();
  const table = within(result.getByRole("table"));
  expect(
    table
      .getAllByRole("columnheader")
      .filter((cell) => !cell.classList.contains("md:hidden"))
      .map((cell) => cell.textContent),
  ).toEqual([
    "Actividad",
    "Lugar",
    "Entrada",
    "Salida",
    "Duración",
    "Acciones",
  ]);
  const cells = activityRow(result, "Finalizada")
    .getAllByRole("cell")
    .filter((cell) => !cell.classList.contains("md:hidden"));
  expect(cells[0].textContent).toBe("Finalizada");
  expect(cells[1].textContent).toBe("Campo");
  expect(cells[4].textContent).toBe("5 min");
  expect(result.queryByRole("button", { name: "Registrar salida" })).toBeNull();
});

test("mobile keeps all information in one table cell and actions in a separate cell", () => {
  const result = view();
  expect(result.queryByRole("list", { name: "En curso" })).toBeNull();
  const cells = activityRow(result, "Segunda").getAllByRole("cell");
  const summary = cells.find((cell) => cell.classList.contains("md:hidden"))!;
  expect(within(summary).getByText("Segunda")).toBeTruthy();
  expect(within(summary).getByText("Campo")).toBeTruthy();
  expect(within(summary).getByText("Entrada")).toBeTruthy();
  expect(within(summary).queryByRole("button")).toBeNull();
  fireEvent.click(
    within(cells[cells.length - 1]).getByRole("button", {
      name: "Registrar salida",
    }),
  );
  expect(result.getByRole("status").textContent).toBe("checkOut:Segunda");
  expect(result.queryByRole("dialog")).toBeNull();
});

test("sorting resets the cursor and sends the requested order to Convex", () => {
  state.canLoad = true;
  const result = view();
  fireEvent.click(result.getByRole("button", { name: "Siguiente" }));
  expect(result.getByText("Página 2")).toBeTruthy();
  fireEvent.click(result.getByRole("button", { name: "Actividad" }));
  expect(result.getByText("Página 1")).toBeTruthy();
  expect(state.query).toHaveBeenLastCalledWith(
    "coachActivities:getById",
    "skip",
  );
  expect(state.query).toHaveBeenCalledWith("coachActivities:listOpenByCoach", {
    coachId: "coach",
    sort: { field: "title", direction: "asc" },
    paginationOpts: { numItems: 10, cursor: null },
  });
  fireEvent.click(result.getByRole("button", { name: "Actividad" }));
  expect(state.query).toHaveBeenCalledWith("coachActivities:listOpenByCoach", {
    coachId: "coach",
    sort: { field: "title", direction: "desc" },
    paginationOpts: { numItems: 10, cursor: null },
  });
});

const rangeSelection: CoachActivityPeriodSelection = {
  preset: "custom",
  range: { from: "2026-11-01", to: "2026-11-30" },
};
function periodView(result: CoachActivityPeriod | undefined) {
  function Harness() {
    const [selection, setSelection] = useState(rangeSelection);
    return (
      <CoachActivities
        coachId={"coach" as Id<"coaches">}
        isArchived={false}
        periodSelection={selection}
        onPeriodChange={setSelection}
        periodResult={result}
      />
    );
  }
  return render(
    <NextIntlClientProvider
      locale="es"
      timeZone="America/New_York"
      messages={{ Coaches: messages, Common: common }}
    >
      <Harness />
    </NextIntlClientProvider>,
  );
}
function readyPeriod(
  activities: ActivityRecord[],
): Extract<CoachActivityPeriod, { status: "ready" }> {
  return {
    status: "ready",
    activities,
    summary: {
      activityCount: activities.length,
      totalDurationMs: 0,
      pendingCount: activities.filter((row) => row.status === "in_progress")
        .length,
      unknownDurationCount: 0,
    },
  };
}

test("the pending checkout remains reachable outside the selected period and from Completed", () => {
  state.openActivityId = "Fuera del período";
  const result = periodView(
    readyPeriod([
      {
        ...record("Completada"),
        status: "completed",
        completed: true,
      },
    ]),
  );
  expect(
    result
      .getByRole("tab", { name: messages.detail.activityHistory })
      .getAttribute("aria-selected"),
  ).toBe("true");
  expect(
    result.queryByRole("button", { name: "Registrar entrada" }),
  ).toBeNull();
  expect(result.queryByText("Fuera del período")).toBeNull();
  fireEvent.click(
    within(
      result.getByRole("group", { name: messages.detail.activityActions }),
    ).getByRole("button", { name: "Registrar salida" }),
  );
  expect(result.getByRole("status").textContent).toBe(
    "checkOut:Fuera del período",
  );
  expect(state.query).toHaveBeenCalledWith(
    "coachActivities:getOpenActivityId",
    { coachId: "coach" },
  );
});

test("bounded period uses local pages and sorting and keeps its page when opening and closing detail", async () => {
  const activities = Array.from({ length: 12 }, (_, i) => ({
    ...record(`Período ${i}`),
    checkInOrder: 1793977200000 + i * 60000,
  }));
  state.selected = activities[0];
  const result = periodView(readyPeriod(activities));
  expect(state.query).toHaveBeenCalledWith(
    "coachActivities:listOpenByCoach",
    "skip",
  );
  expect(state.query).toHaveBeenCalledWith(
    "coachActivities:listHistoryByCoach",
    "skip",
  );
  expect(result.getByText("Página 1 de 2")).toBeTruthy();
  fireEvent.click(result.getByRole("button", { name: "Siguiente" }));
  expect(result.getByText("Página 2 de 2")).toBeTruthy();
  const opener = activityElement(result, "Período 0");
  fireEvent.click(opener);
  expect(result.getByRole("dialog")).toBeTruthy();
  fireEvent.click(result.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(document.activeElement).toBe(opener));
  expect(result.getByText("Página 2 de 2")).toBeTruthy();
  fireEvent.click(result.getByRole("button", { name: "Actividad" }));
  await waitFor(() => expect(result.getByText("Página 1 de 2")).toBeTruthy());
  const rows = within(result.getByRole("table")).getAllByRole("row").slice(1);
  expect(within(rows[0]).getAllByText("Período 0")).toHaveLength(2);
  expect(within(rows[2]).getAllByText("Período 10")).toHaveLength(2);
});

test("period tabs keep pending and completed activities separate", () => {
  const result = periodView(
    readyPeriod([
      record("Pendiente"),
      {
        ...record("Completada"),
        status: "completed",
        completed: true,
        durationMs: 60000,
      },
    ]),
  );
  expect(activityElement(result, "Pendiente")).toBeTruthy();
  expect(
    within(result.getByRole("table")).queryAllByText("Completada"),
  ).toHaveLength(0);
  expect(result.getByRole("status").textContent).toContain(
    "1 actividad pendiente de salida",
  );
  fireEvent.mouseDown(result.getByRole("tab", { name: "Completadas" }), {
    button: 0,
    ctrlKey: false,
  });
  expect(activityElement(result, "Completada")).toBeTruthy();
  expect(
    within(result.getByRole("table")).queryAllByText("Pendiente"),
  ).toHaveLength(0);
});

test("oversized periods display a recovery message without a partial table", () => {
  const result = periodView({ status: "limitExceeded" });
  expect(result.queryByRole("table")).toBeNull();
  expect(result.getByRole("alert").textContent).toContain(
    "No se muestra un total parcial",
  );
  expect(
    result.getByRole("combobox", { name: "Período de actividades" }),
  ).toBeTruthy();
});

test("custom drafts do not change the applied range until both dates are valid and submitted", () => {
  const result = periodView(readyPeriod([record("En rango")]));
  fireEvent.click(result.getByRole("button", { name: /1 nov 2026/ }));
  const from = result.getByLabelText("Desde");
  const to = result.getByLabelText("Hasta");
  fireEvent.change(from, { target: { value: "2026-12-01" } });
  expect(
    result
      .getByRole("button", { name: "Aplicar rango" })
      .hasAttribute("disabled"),
  ).toBe(true);
  expect(result.getByRole("button", { name: /1 nov 2026/ })).toBeTruthy();
  fireEvent.change(to, { target: { value: "2026-12-31" } });
  fireEvent.click(result.getByRole("button", { name: "Aplicar rango" }));
  expect(result.queryByLabelText("Desde")).toBeNull();
  expect(result.getByRole("button", { name: /1 dic 2026/ })).toBeTruthy();
});

test("clearing the period restores native Convex pagination", async () => {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  state.canLoad = true;
  const result = periodView(readyPeriod([record("Filtrada")]));
  fireEvent.keyDown(
    result.getByRole("combobox", { name: "Período de actividades" }),
    { key: "Enter" },
  );
  fireEvent.click(
    await result.findByRole("option", { name: "Todas las fechas" }),
  );
  expect(result.getByText("Página 1")).toBeTruthy();
  expect(activityElement(result, "Primera")).toBeTruthy();
  fireEvent.click(result.getByRole("button", { name: "Siguiente" }));
  expect(activityElement(result, "Tercera")).toBeTruthy();
  expect(state.query).toHaveBeenCalledWith(
    "coachActivities:listOpenByCoach",
    expect.objectContaining({
      paginationOpts: { numItems: 10, cursor: "next" },
    }),
  );
});

test("period date ordering uses normalized legacy instants and follows native null ordering", () => {
  const result = periodView(
    readyPeriod([
      {
        ...record("Desconocida"),
        status: undefined,
        checkInAt: undefined,
        checkInOrder: null,
      },
      {
        ...record("Anterior"),
        status: undefined,
        checkInAt: undefined,
        checkInOrder: 1793970000000,
      },
      { ...record("Nueva"), status: "completed", completed: true },
    ]),
  );
  const firstTitle = () =>
    within(result.getByRole("table")).getAllByRole("row")[1].textContent!;
  expect(firstTitle()).toContain("Nueva");
  fireEvent.click(result.getByRole("button", { name: "Entrada" }));
  expect(firstTitle()).toContain("Desconocida");
});

test("period annotations describe unavailable data without judging overlapping or overnight activities", () => {
  const period = readyPeriod([
    {
      ...record("Actividad A"),
      status: "completed",
      completed: true,
      checkOutAt: 1793977500000,
      durationMs: 300000,
    },
    {
      ...record("Actividad B"),
      status: "completed",
      completed: true,
      checkOutAt: 1794063900000,
      durationMs: 86700000,
    },
    {
      ...record("Sin duración"),
      status: undefined,
      checkInAt: undefined,
      completed: false,
    },
  ]);
  period.summary.unknownDurationCount = 1;
  const result = periodView(period);
  expect(result.getByRole("status").textContent).toBe(
    "1 actividad sin duración disponible con los datos registrados. No está incluida en el tiempo total.",
  );
  expect(
    activityRow(result, "Sin duración").getAllByText("No disponible"),
  ).toHaveLength(2);
  expect(result.queryByRole("alert")).toBeNull();
  expect(result.container.textContent).not.toMatch(
    /superpone|revisión|pago|descontado|días distintos/,
  );
  expect(result.container.querySelector(".lucide-triangle-alert")).toBeNull();
});

test("empty period messages describe the active tab and the selected range", () => {
  const result = periodView(readyPeriod([]));
  expect(result.getByRole("status").textContent).toBe(
    messages.detail.emptyPeriodHistory,
  );
  fireEvent.mouseDown(result.getByRole("tab", { name: "En curso" }), {
    button: 0,
    ctrlKey: false,
  });
  expect(result.getByRole("status").textContent).toBe(
    messages.detail.emptyPeriodOpenActivities,
  );
  expect(result.container.textContent).toContain(
    "Zona horaria: America/New_York",
  );
  expect(result.container.textContent).not.toContain("Poinciana");
});
