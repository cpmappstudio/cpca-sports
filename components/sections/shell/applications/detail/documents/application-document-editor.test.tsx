// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
const state = vi.hoisted(() => ({
  latest: {
    name: "Consent",
    author: "Applicant",
    sourceAttachmentId: "original",
    storageId: null,
    url: "https://files.example/form.pdf",
    fileName: "form.pdf",
    needsRestart: false,
  } as Record<string, unknown> | null,
  saved: vi.fn(),
}));
vi.mock("convex/react", () => ({ useQuery: () => state.latest }));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: async () => "token" }),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("sonner", () => ({ toast: { success: state.saved, error: vi.fn() } }));
vi.mock("next/dynamic", () => ({
  default: () =>
    function Viewer({
      viewerRef,
      onReady,
      onChange,
    }: {
      viewerRef: Ref<{ exportPdf: () => Promise<Blob> }>;
      onReady: () => void;
      onChange: () => void;
    }) {
      const ready = useRef(onReady);
      useEffect(() => ready.current(), []);
      useImperativeHandle(viewerRef, () => ({
        exportPdf: async () =>
          new Blob(["%PDF-filled"], { type: "application/pdf" }),
      }));
      return <button onClick={onChange}>Fill field</button>;
    },
}));
import { ApplicationDocumentEditor } from "./application-document-editor";
import type { Id } from "@/convex/_generated/dataModel";
beforeEach(() => {
  state.latest = {
    name: "Consent",
    author: "Applicant",
    sourceAttachmentId: "original",
    storageId: null,
    url: "https://files.example/form.pdf",
    fileName: "form.pdf",
    needsRestart: false,
  };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>complete</button>
      {open ? (
        <ApplicationDocumentEditor
          applicationId={"application" as Id<"applications">}
          documentTypeId="consent"
          isAdmin={false}
          onSaved={() => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
function button() {
  return <Harness />;
}

async function open() {
  fireEvent.click(screen.getByRole("button", { name: "complete" }));
  await screen.findByRole("button", { name: "Fill field" });
  fireEvent.click(screen.getByRole("button", { name: "Fill field" }));
}

test("closing asks before discarding; revoked access keeps the open work available", async () => {
  const view = render(button());
  await open();
  fireEvent.click(screen.getByRole("button", { name: "close" }));
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "keepEditing" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  state.latest = null;
  view.rerender(button());
  expect(screen.getByRole("alert").textContent).toBe("conflict");
  expect(
    screen.getByRole("button", { name: "submit" }).hasAttribute("disabled"),
  ).toBe(true);
  expect(
    screen.getByRole("button", { name: "download" }).hasAttribute("disabled"),
  ).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "close" }));
  fireEvent.click(screen.getByRole("button", { name: "discard" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("save exports and submits, confirms success, and closes the editor", async () => {
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://test.convex.cloud");
  const fetcher = vi.fn(
    async () => new Response(JSON.stringify({ storageId: "delivered" })),
  );
  vi.stubGlobal("fetch", fetcher);
  render(button());
  await open();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "submit" }));
  });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(state.saved).toHaveBeenCalledWith("saved");
  expect(fetcher).toHaveBeenCalledOnce();
});

test("a changed original requires an explicit restart before opening the current school file", async () => {
  state.latest!.needsRestart = true;
  render(button());
  fireEvent.click(screen.getByRole("button", { name: "complete" }));
  await screen.findByText("restartWarning");
  expect(screen.queryByRole("button", { name: "Fill field" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "restart" }));
  expect(
    await screen.findByRole("button", { name: "Fill field" }),
  ).toBeTruthy();
});
