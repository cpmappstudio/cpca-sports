// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { Preloaded } from "convex/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, expect, test, vi } from "vitest";
import { getFunctionName } from "convex/server";
import type {
  CoachActivityPeriod,
  CoachActivityPeriodSelection,
} from "@/lib/coaches/types";
import { api } from "@/convex/_generated/api";
import messages from "@/messages/es/coaches.json";
import { CoachDetailView } from "./coach-detail";

const state = vi.hoisted(() => ({
  query: vi.fn(),
  period: undefined as CoachActivityPeriod | undefined,
  summary: { activityCount: 12, totalMinutes: 150 } as
    { activityCount: number; totalMinutes: number } | undefined,
}));
vi.mock("convex/react", () => ({
  usePreloadedQuery: () => ({
    coach: { _id: "coach", isArchived: false },
    user: {
      firstName: "Alvin",
      lastName: "Cruz",
      email: "alvin@example.com",
      isActive: true,
    },
    program: { name: "Basketball" },
    position: { name: "Coach" },
    isAdmin: false,
  }),
  useQuery: (
    reference: Parameters<typeof getFunctionName>[0],
    args: unknown,
  ) => {
    const name = getFunctionName(reference);
    state.query(name, args);
    if (args === "skip") return undefined;
    return name.endsWith("getPeriodByCoach") ? state.period : state.summary;
  },
  useMutation: () => vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@/components/common/entity-detail-profile", () => ({
  EntityDetailBackButton: ({ label }: { label: string }) => (
    <button>{label}</button>
  ),
}));
vi.mock("./coach-dialog", () => ({ CoachDialog: () => null }));
vi.mock("./coach-activities", () => ({
  CoachActivities: ({
    onPeriodChange,
  }: {
    onPeriodChange: (selection: CoachActivityPeriodSelection) => void;
  }) => (
    <section aria-label="Lista de actividades">
      <button
        onClick={() =>
          onPeriodChange({
            preset: "custom",
            range: { from: "2026-11-01", to: "2026-11-30" },
          })
        }
      >
        Filtrar período
      </button>
      <button onClick={() => onPeriodChange({ preset: "all", range: null })}>
        Todas las fechas
      </button>
    </section>
  ),
}));
function view() {
  return render(
    <NextIntlClientProvider
      locale="es"
      timeZone="America/New_York"
      messages={{ Coaches: messages }}
    >
      <CoachDetailView
        preloadedCoach={{} as Preloaded<typeof api.coaches.getById>}
        tenant="cpca-sports"
        programs={[]}
      />
    </NextIntlClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  state.query.mockClear();
  state.period = undefined;
  state.summary = { activityCount: 12, totalMinutes: 150 };
});
test("profile information is visible with two summary cards and hours plus remaining minutes", () => {
  const result = view();
  expect(result.getByText("alvin@example.com")).toBeTruthy();
  expect(result.getByText("Basketball")).toBeTruthy();
  expect(result.getByText("Coach")).toBeTruthy();
  expect(result.queryByRole("button", { name: "Ver perfil" })).toBeNull();
  expect(result.container.querySelectorAll('[data-slot="card"]')).toHaveLength(
    2,
  );
  expect(result.getByText("2 h 30 min")).toBeTruthy();
  expect(result.getByText("Tiempo acumulado")).toBeTruthy();
});
test("duration waits for the server summary and represents an empty total as zero", () => {
  state.summary = undefined;
  const result = view();
  expect(result.getAllByText("—")).toHaveLength(2);
  state.summary = { activityCount: 0, totalMinutes: 0 };
  result.rerender(
    <NextIntlClientProvider
      locale="es"
      timeZone="America/New_York"
      messages={{ Coaches: messages }}
    >
      <CoachDetailView
        preloadedCoach={{} as Preloaded<typeof api.coaches.getById>}
        tenant="cpca-sports"
        programs={[]}
      />
    </NextIntlClientProvider>,
  );
  expect(result.getByText("0 min")).toBeTruthy();
  expect(result.queryByText("—")).toBeNull();
});

test("summary subscribes without a date key or a periodic timer", () => {
  const interval = vi.spyOn(globalThis, "setInterval");
  view();
  expect(state.query).toHaveBeenCalledWith("coachActivities:getSummary", {
    coachId: "coach",
  });
  expect(interval).not.toHaveBeenCalled();
});

test("a range uses one period query for rows and totals and skips lifetime totals", () => {
  state.period = {
    status: "ready",
    activities: [],
    summary: {
      activityCount: 3,
      totalDurationMs: 3630000,
      pendingCount: 1,
      unknownDurationCount: 0,
    },
  };
  const result = view();
  expect(result.getByText("2 h 30 min")).toBeTruthy();
  fireEvent.click(result.getByRole("button", { name: "Filtrar período" }));
  expect(state.query).toHaveBeenCalledWith(
    "coachActivities:getSummary",
    "skip",
  );
  expect(state.query).toHaveBeenCalledWith("coachActivities:getPeriodByCoach", {
    coachId: "coach",
    range: { from: "2026-11-01", to: "2026-11-30" },
  });
  expect(result.queryByText("2 h 30 min")).toBeNull();
  expect(result.getByText("1 h 0 min")).toBeTruthy();
  expect(result.getByText("Tiempo del período")).toBeTruthy();
  fireEvent.click(result.getByRole("button", { name: "Todas las fechas" }));
  expect(state.query).toHaveBeenLastCalledWith("coachActivities:getSummary", {
    coachId: "coach",
  });
  expect(result.getByText("Tiempo acumulado")).toBeTruthy();
});

test.each([undefined, { status: "limitExceeded" }] as const)(
  "unavailable period totals never display stale lifetime values (%j)",
  (period) => {
    state.period = period;
    const result = view();
    fireEvent.click(result.getByRole("button", { name: "Filtrar período" }));
    expect(result.getAllByText("—")).toHaveLength(2);
    expect(result.queryByText("2 h 30 min")).toBeNull();
  },
);
