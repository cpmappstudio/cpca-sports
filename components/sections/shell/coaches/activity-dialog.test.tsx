// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { ConvexError } from "convex/values";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import type { CoachActivity } from "@/lib/coaches/types";
import messages from "@/messages/es/coaches.json";
import { ActivityDialog } from "./activity-dialog";

const state = vi.hoisted(() => ({
  activity: undefined as CoachActivity | null | undefined,
  places: [{ _id: "place", name: "Campo" }] as { _id: string; name: string }[],
  checkIn: vi.fn(),
  checkOut: vi.fn(),
  update: vi.fn(),
  generateUploadUrl: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("convex/react", async () => {
  const { getFunctionName } = await import("convex/server");
  return {
    useQuery: (
      reference: Parameters<typeof getFunctionName>[0],
      args: unknown,
    ) =>
      args === "skip"
        ? undefined
        : getFunctionName(reference).endsWith("getById")
          ? state.activity
          : state.places,
    useMutation: (reference: Parameters<typeof getFunctionName>[0]) =>
      ({
        checkIn: state.checkIn,
        checkOut: state.checkOut,
        update: state.update,
        generateUploadUrl: state.generateUploadUrl,
      })[getFunctionName(reference).split(":")[1] as "checkIn"],
  };
});
vi.mock("sonner", () => ({
  toast: { success: state.success, error: state.error },
}));
vi.mock("./activity-camera", () => ({
  ActivityCameraCapture: ({
    photo,
    onCapture,
    disabled,
  }: {
    photo: Blob | null;
    onCapture: (photo: Blob | null) => void;
    disabled: boolean;
  }) => (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onCapture(new Blob(["captured"], { type: "image/webp" }))
        }
      >
        Tomar foto de prueba
      </button>
      {photo ? <p>Foto capturada</p> : null}
    </div>
  ),
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
    disabled,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (value: string) => void;
    disabled: boolean;
  }) => (
    <select
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => <option value="">Selecciona un lugar</option>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
}));

const coachId = "coach" as Id<"coaches">;
const activityId = "activity" as Id<"coachActivities">;
function activity(): CoachActivity {
  return {
    _id: activityId,
    _creationTime: 1,
    coachId,
    programId: "program" as Id<"programs">,
    placeId: "place" as Id<"programCoachOptions">,
    placeName: "Campo",
    title: "Bateo",
    activityDate: "2026-11-06",
    startTime: "10:00",
    imageStorageId: "entry" as Id<"_storage">,
    imageUrl: "https://files.example/entry.jpg",
    checkOutImageUrl: null,
    checkInAt: 1793977200000,
    status: "in_progress",
    timeZone: "America/New_York",
    completed: false,
    createdBy: "owner" as Id<"users">,
    updatedBy: "owner" as Id<"users">,
    createdAt: 1,
    updatedAt: 1,
  };
}
function view(action: "checkIn" | "checkOut" | "edit", close = vi.fn()) {
  return {
    close,
    ...render(
      <NextIntlClientProvider
        locale="es"
        timeZone="America/New_York"
        messages={{ Coaches: messages }}
      >
        <ActivityDialog
          open
          onOpenChange={close}
          coachId={coachId}
          action={action}
          activityId={action === "checkIn" ? undefined : activityId}
        />
      </NextIntlClientProvider>,
    ),
  };
}
function enterDetails(result: ReturnType<typeof view>) {
  fireEvent.change(result.getByLabelText(/Título/), {
    target: { value: "Bateo" },
  });
  fireEvent.change(result.getByRole("combobox"), {
    target: { value: "place" },
  });
  fireEvent.click(
    result.getByRole("button", { name: /Continuar a la cámara/ }),
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  state.activity = activity();
  state.places = [{ _id: "place", name: "Campo" }];
  state.generateUploadUrl.mockResolvedValue("https://uploads.example/photo");
  state.checkIn.mockResolvedValue(activityId);
  state.checkOut.mockResolvedValue(null);
  state.update.mockResolvedValue(null);
  state.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ storageId: "uploaded" }),
  });
  vi.stubGlobal("fetch", state.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("check-in has a details step and requires a camera photo before confirming", async () => {
  const result = view("checkIn");
  expect(
    result.getByRole("note", {
      name: messages.activityDialog.automaticTimeTitle,
    }),
  ).toBeTruthy();
  expect(result.getByText(messages.activityDialog.automaticTime)).toBeTruthy();
  expect(result.getByText("Zona horaria: America/New_York")).toBeTruthy();
  expect(result.container.textContent).not.toContain("Poinciana");
  expect(
    result.container.querySelector(
      'input[type="file"], input[type="time"], input[type="date"]',
    ),
  ).toBeNull();
  expect(
    (
      result.getByRole("button", {
        name: /Continuar a la cámara/,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  enterDetails(result);
  expect(result.queryByText(messages.activityDialog.automaticTime)).toBeNull();
  expect(result.queryByText("Zona horaria: America/New_York")).toBeNull();
  expect(
    result.queryByRole("button", { name: "Confirmar entrada" }),
  ).toBeNull();
  fireEvent.click(result.getByRole("button", { name: "Tomar foto de prueba" }));
  fireEvent.click(result.getByRole("button", { name: "Confirmar entrada" }));
  await waitFor(() =>
    expect(state.checkIn).toHaveBeenCalledWith({
      coachId,
      placeId: "place",
      title: "Bateo",
      description: undefined,
      imageStorageId: "uploaded",
    }),
  );
  expect(state.fetch.mock.calls[0][1]).toMatchObject({
    method: "POST",
    headers: { "Content-Type": "image/webp" },
    body: expect.any(Blob),
  });
  expect(result.close).toHaveBeenCalledWith(false);
});
test("a failed save retries the same uploaded photo and preserves the captured preview", async () => {
  state.checkIn.mockRejectedValueOnce(new Error("network failure"));
  const result = view("checkIn");
  enterDetails(result);
  fireEvent.click(result.getByRole("button", { name: "Tomar foto de prueba" }));
  fireEvent.click(result.getByRole("button", { name: "Confirmar entrada" }));
  await waitFor(() => expect(state.error).toHaveBeenCalled());
  expect(result.getByText("Foto capturada")).toBeTruthy();
  fireEvent.click(result.getByRole("button", { name: "Confirmar entrada" }));
  await waitFor(() => expect(result.close).toHaveBeenCalledWith(false));
  expect(state.fetch).toHaveBeenCalledOnce();
  expect(state.checkIn).toHaveBeenCalledTimes(2);
  expect(state.checkIn.mock.calls[1][0].imageStorageId).toBe("uploaded");
});

test.each(["generateUploadUrl", "checkIn"] as const)(
  "a competing check-in shows the rule clearly at %s and retains the photo",
  async (stage) => {
    state[stage].mockRejectedValueOnce(
      new ConvexError("Coach already has an activity in progress"),
    );
    const result = view("checkIn");
    enterDetails(result);
    fireEvent.click(
      result.getByRole("button", { name: "Tomar foto de prueba" }),
    );
    fireEvent.click(result.getByRole("button", { name: "Confirmar entrada" }));
    await waitFor(() =>
      expect(state.error).toHaveBeenCalledWith(
        messages.activityDialog.errors.activityInProgress,
      ),
    );
    expect(result.close).not.toHaveBeenCalled();
    expect(result.getByText("Foto capturada")).toBeTruthy();
    if (stage === "generateUploadUrl") {
      expect(state.fetch).not.toHaveBeenCalled();
      expect(state.checkIn).not.toHaveBeenCalled();
    }
  },
);
test("checkout takes a new photo for the selected activity without editable times or metadata", async () => {
  const result = view("checkOut");
  expect(
    result.getByText(messages.activityDialog.checkOutDescription),
  ).toBeTruthy();
  expect(result.queryByText(messages.activityDialog.automaticTime)).toBeNull();
  expect(result.queryByLabelText(/Título/)).toBeNull();
  expect(result.queryByRole("button", { name: "Confirmar salida" })).toBeNull();
  fireEvent.click(result.getByRole("button", { name: "Tomar foto de prueba" }));
  fireEvent.click(result.getByRole("button", { name: "Confirmar salida" }));
  await waitFor(() =>
    expect(state.checkOut).toHaveBeenCalledWith({
      activityId,
      imageStorageId: "uploaded",
    }),
  );
  expect(state.checkIn).not.toHaveBeenCalled();
  expect(state.generateUploadUrl).toHaveBeenCalledWith({ coachId, activityId });
  expect(state.fetch.mock.calls[0][1]).toMatchObject({
    headers: { "Content-Type": "image/webp" },
    body: expect.any(Blob),
  });
});
test("editing saves only title, description and place and never requests camera uploads", async () => {
  const result = view("edit");
  expect(result.queryByText(messages.activityDialog.automaticTime)).toBeNull();
  expect(result.queryByText("Tomar foto de prueba")).toBeNull();
  fireEvent.change(result.getByLabelText(/Título/), {
    target: { value: "Nuevo título" },
  });
  fireEvent.click(result.getByRole("button", { name: "Guardar cambios" }));
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      activityId,
      placeId: "place",
      title: "Nuevo título",
      description: undefined,
    }),
  );
  expect(state.fetch).not.toHaveBeenCalled();
  expect(state.generateUploadUrl).not.toHaveBeenCalled();
});
test("missing places explain the configuration issue and prevent progression", () => {
  state.places = [];
  const result = view("checkIn");
  expect(result.getByRole("alert").textContent).toContain(
    "No hay lugares configurados",
  );
  expect(
    (
      result.getByRole("button", {
        name: /Continuar a la cámara/,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
test("an activity closed from another device cannot start another checkout", () => {
  state.activity = {
    ...activity(),
    status: "completed",
    completed: true,
    checkOutAt: 1793980800000,
  };
  const result = view("checkOut");
  expect(result.queryByText("Tomar foto de prueba")).toBeNull();
  expect(result.getByRole("status").textContent).toContain(
    "ya no está en curso",
  );
});
test("closing and canceling are disabled while the photo and operation are saving", async () => {
  let finish!: (result: unknown) => void;
  state.fetch.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const result = view("checkIn");
  enterDetails(result);
  fireEvent.click(result.getByRole("button", { name: "Tomar foto de prueba" }));
  fireEvent.click(result.getByRole("button", { name: "Confirmar entrada" }));
  await waitFor(() => expect(state.fetch).toHaveBeenCalled());
  expect(result.queryByRole("button", { name: "Close" })).toBeNull();
  expect(
    (result.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.keyDown(result.getByRole("dialog"), { key: "Escape" });
  expect(result.close).not.toHaveBeenCalled();
  await act(async () =>
    finish({ ok: true, json: async () => ({ storageId: "uploaded" }) }),
  );
  await waitFor(() => expect(result.close).toHaveBeenCalledWith(false));
});

test("a rejected check-in allows correcting details after the photo upload", async () => {
  state.checkIn.mockRejectedValueOnce(new ConvexError("Invalid place"));
  const result = view("checkIn");
  enterDetails(result);
  fireEvent.click(result.getByRole("button", { name: "Tomar foto de prueba" }));
  fireEvent.click(result.getByRole("button", { name: "Confirmar entrada" }));
  await waitFor(() => expect(state.error).toHaveBeenCalled());
  const edit = result.getByRole("button", {
    name: "Editar datos",
  }) as HTMLButtonElement;
  expect(edit.disabled).toBe(false);
  fireEvent.click(edit);
  expect((result.getByLabelText(/Título/) as HTMLInputElement).value).toBe(
    "Bateo",
  );
});
